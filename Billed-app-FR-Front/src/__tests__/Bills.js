/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH } from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import Bills from "../containers/Bills.js"
import router from "../app/Router.js"
// API de test
import mockStore from "../__mocks__/store"

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    // on verifie que l'icone bill est bien en surbrillance dans la barre verticale gauche
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon.classList.contains('active-icon')).toBe(true)
    })
    // On verifie qu'on trie bien la liste des notes de frais du plus récent au plus ancien 
    test("Then bills should be ordered from earliest to latest", () => {
      // on injecte les données de test dans le DOM
      document.body.innerHTML = BillsUI({ data: bills })
      // expression regulière de validation de date
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
    // on test le verificateur de date
    describe("When dates are not in the expected format", () => {
      test("Then convertDate should handle different date formats", () => {
        // On envoie deux formats différents (... on injecte dans l'existant sans modifier les autres propriétées)
        const billsDates = [
          {...bills[0], date: "2021-11-19"}, 
          {...bills[0], date: "19 nov. 21"}, 
        ];
        // on injecte les données de test dans le DOM et on teste
        document.body.innerHTML = BillsUI({ data: billsDates })      
        // Expression regulière de validation de date
        const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
        expect(dates).toBeDefined()
      })
    })
    // On verifie que le clic sur le bouton "Nouvelle note de frais" est possible
    describe("When I click on New Bill button", () => {
      test("Then I should be redirected to New Bill form", () => {
        const onNavigate = jest.fn();
        const billPage = new Bills({ document, onNavigate, store: null, localStorage: window.localStorage });
        billPage.handleClickNewBill();
        // On verifie que onNavigate est bien chargée avec NewBill
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill']);
      })
    })

    // Vérification du clic sur l'icône œil et que la modal s'ouvre bien
    describe("When I click on eye icon", () => {
      test("Then the modal should open", () => {
        // on injecte les données de test dans le DOM
        document.body.innerHTML = BillsUI({ data: bills })
        // on crée un objet Bills depuis src/containers/Bills.js
        const bill = new Bills({
          document,
          onNavigate: null,
          store: null,
          localStorage: window.localStorage
        })
        // on verifie que la fonction jQuery modal est bien appelée au clic sur l'oeil
        const iconEye = screen.getAllByTestId('icon-eye')[0]
        $.fn.modal = jest.fn()
        bill.handleClickIconEye(iconEye)
        expect($.fn.modal).toHaveBeenCalled()
      })
    })

    // Test appel API + 404 et 500 
    describe("When i am loading the API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills")
      })
        // Test pour couvrir le cas d'erreur de formatage de date
      test("Then it should handle date formatting error", async () => {
        // On crée une facture avec une date invalide
        const billsWithBadDate = [{
          id: "1234",
          status: "pending",
          date: "date-invalide",
          amount: 100,
          type: "Restaurant",
          commentary: "dîner",
          fileUrl: "http://exemple.com",
          fileName: "facture.jpg",
          email: "test@test.com"
        }]
        mockStore.bills.mockImplementationOnce(() => ({
          list: () => Promise.resolve(billsWithBadDate)
        }))
        // on crée un objet Bills depuis src/containers/Bills.js
        const billsPage = new Bills({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage
        })
        // On récupère les factures et on verifie que ça s'affiche
        const result = await billsPage.getBills()
        expect(result[0].date).toBe("date-invalide")
      })
      // Test qui vérifie que les factures sont bien récupérées depuis l'API simulée
      test("Then it should fetch bills from the mock API", async () => {
        localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }));
        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.append(root)
        router()
        window.onNavigate(ROUTES_PATH.Bills)
        const billsPage = new Bills({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage
        });
        const getBills = jest.spyOn(billsPage, "getBills");
        const bills = await billsPage.getBills();
        expect(getBills).toHaveBeenCalled();
        expect(bills.length).toBeGreaterThan(0);
      });
      // 404 
      test("Then it should fails with 404 message error when API fire a 404", async () => {
        // On modifie l'API mockStore.bills injecter l'erreur 404
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => Promise.reject(new Error("Erreur 404"))
          }
        })
        // on crée un objet Bills depuis src/containers/Bills.js
        const billsPage = new Bills({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage
        });
        // getBills() affiche bien "Erreur 404"
        await expect(billsPage.getBills()).rejects.toThrow("Erreur 404")
        expect(document.body.innerHTML).toContain("Erreur 404")
      });
      // 500 
      test("Then it should fails with 500 message error when API fire a 500", async () => {
        // On modifie l'API mockStore.bills injecter l'erreur 500
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => Promise.reject(new Error("Erreur 500"))
          }
        })
        // on crée un objet Bills depuis src/containers/Bills.js
        const billsPage = new Bills({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage
        });
        // getBills() affiche bien "Erreur 500"
        await expect(billsPage.getBills()).rejects.toThrow("Erreur 500")
        expect(document.body.innerHTML).toContain("Erreur 500")
      });
    });
    test("Then getBills return empty if api return null", () => {
      const billsPage = new Bills({
        document,
        onNavigate: null,
        store: null, 
        localStorage: window.localStorage
      });
      const result = billsPage.getBills();
      expect(result).toBeUndefined();
    });
  })
})