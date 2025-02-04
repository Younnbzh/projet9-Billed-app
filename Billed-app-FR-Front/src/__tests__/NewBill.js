/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import { ROUTES_PATH } from "../constants/routes.js";
// API de test
import mockStore from "../__mocks__/store";
jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      document.body.innerHTML = NewBillUI()
    })
    // on verifie qu'uniquement les fichiers jpg png et jpeg sont acceptés
    describe("When i upload a file", () => {
      test("Then it should show error message for invalid file type", async () => {
        const onNavigate = jest.fn();
        // on crée un objet NewBill depuis src/containers/NewBill.js
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        })
        const inputFile = screen.getByTestId("file");
        const errorMessage = document.querySelector("#file-error-message");
        // Test avec un fichier PDF (format non autorisé)
        const invalidFile = new File(["file"], "document.pdf", { type: "application/pdf" });
        Object.defineProperty(inputFile, 'files', { value: [invalidFile] });
        const invalidEvent = {
          preventDefault: jest.fn(),
          target: {
            value: "C:\\fakepath\\document.pdf",
            files: [invalidFile]
          }
        };
        // On verifie que le message d'erreur est bien caché au chargement
        expect(errorMessage.style.display).toBe("none");
        await newBill.handleChangeFile(invalidEvent);
        // Une fois envoyé on verifie que le message d'erreur est affiché avec le bon texte
        expect(errorMessage.style.display).toBe("block");
        expect(errorMessage.textContent).toBe("Merci d'uploader uniquement un fichier jpg, jpeg ou png");
        expect(inputFile.value).toBe("");
      });
      test("Then it should accept jpg, jpeg, or png and hide error message", async () => {
        const onNavigate = jest.fn();
        // on crée un objet NewBill depuis src/containers/NewBill.js
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        })
        const inputFile = screen.getByTestId("file");
        const errorMessage = document.querySelector("#file-error-message");
        // Test avec un fichier png
        const validFile = new File(["file"], "test.png", { type: "image/png" });
        Object.defineProperty(inputFile, 'files', { value: [validFile] });
        const validEvent = {
          preventDefault: jest.fn(),
          target: {
            value: "C:\\fakepath\\test.png",
            files: [validFile]
          }
        };
        const createSpy = jest.spyOn(mockStore.bills(), 'create')
          .mockImplementation(() => {
            return Promise.resolve({
              fileUrl: 'https://localhost/file.png',
              key: '1234'
            });
          });
        await newBill.handleChangeFile(validEvent);
        // On verifie que le message d'erreur est bien caché 
        expect(errorMessage.style.display).toBe("none");
        expect(errorMessage.textContent).toBe("");
        // On verifie que le formulaire s'envoie bien
        expect(createSpy).toHaveBeenCalled();
        await waitFor(() => {
          expect(newBill.fileName).toBe("test.png");
          expect(newBill.fileUrl).toBe("https://localhost/file.png");
        });
      });
    })
    // on verifie que le post se passe bien
    describe("When i am submitting the form", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills")
      })
      test("Then it should post the new bill to mock API", async () => {
        const onNavigate = jest.fn();
        // on crée un objet NewBill depuis src/containers/NewBill.js
        const newBillPage = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        });
        const form = screen.getByTestId("form-new-bill");
        const createSpy = jest.spyOn(mockStore.bills(), 'create');
        // Remplissage du formulaire avec des données de test
        screen.getByTestId("expense-type").value = "Transports";
        screen.getByTestId("expense-name").value = "Uber";
        screen.getByTestId("amount").value = "100";
        screen.getByTestId("datepicker").value = "2025-02-03";
        screen.getByTestId("vat").value = "20";
        screen.getByTestId("pct").value = "20";
        screen.getByTestId("commentary").value = "Trajet rendez-vous charles";
        newBillPage.fileUrl = "https://localhost/file.png";
        newBillPage.fileName = "file.png";
        // on verifie que le post se passe bien
        fireEvent.submit(form);
        expect(createSpy).toHaveBeenCalled();
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills']);
        // on test aussi avec un pct par défaut qui doit se set à 20
        screen.getByTestId("pct").value = "";
        fireEvent.submit(form);
        expect(createSpy).toHaveBeenCalled();
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills']);
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        const onNavigate = jest.fn();
        const consoleSpy = jest.spyOn(console, 'error');
        const mockStore = {
          bills: () => ({
            update: jest.fn().mockRejectedValueOnce(new Error("Erreur 404"))
          })
        };
        // on crée un objet NewBill depuis src/containers/NewBill.js avec une erreur 404
        const newBillPage = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        });
        // on prepare un formulaire de test
        const form = screen.getByTestId("form-new-bill");
        screen.getByTestId("expense-type").value = "Transports";
        screen.getByTestId("expense-name").value = "Test";
        screen.getByTestId("datepicker").value = "2024-01-01";
        screen.getByTestId("amount").value = "100";
        screen.getByTestId("vat").value = "20";
        screen.getByTestId("pct").value = "20";
        screen.getByTestId("commentary").value = "Test";
        newBillPage.billId = "1234";
        newBillPage.fileName = "test.jpg";
        newBillPage.fileUrl = "https://test.jpg";
        // on le soumet et on verifie qu'on a bien une erreur 404 de l'api
        await fireEvent.submit(form);
        return new Promise(process.nextTick).then(() => {
          expect(consoleSpy).toHaveBeenCalledWith(new Error("Erreur 404"));
        });
      });
      test("fetches bills from an API and fails with 500 message error", async () => {
        const onNavigate = jest.fn();
        const consoleSpy = jest.spyOn(console, 'error');
        const mockStore = {
          bills: () => ({
            update: jest.fn().mockRejectedValueOnce(new Error("Erreur 500"))
          })
        };
        // on crée un objet NewBill depuis src/containers/NewBill.js avec une erreur 500
        const newBillPage = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        });
        // on prepare un formulaire de test
        const form = screen.getByTestId("form-new-bill");
        screen.getByTestId("expense-type").value = "Transports";
        screen.getByTestId("expense-name").value = "Test";
        screen.getByTestId("datepicker").value = "2024-01-01";
        screen.getByTestId("amount").value = "100";
        screen.getByTestId("vat").value = "20";
        screen.getByTestId("pct").value = "20";
        screen.getByTestId("commentary").value = "Test";
        newBillPage.billId = "1234";
        newBillPage.fileName = "test.jpg";
        newBillPage.fileUrl = "https://test.jpg";
        // on le soumet et on verifie qu'on a bien une erreur 500 de l'api
        await fireEvent.submit(form);
        return new Promise(process.nextTick).then(() => {
          expect(consoleSpy).toHaveBeenCalledWith(new Error("Erreur 500"));
        });
      });
    });
  });
});