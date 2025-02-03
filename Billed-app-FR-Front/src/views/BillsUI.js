import VerticalLayout from './VerticalLayout.js'
import ErrorPage from "./ErrorPage.js"
import LoadingPage from "./LoadingPage.js"

import Actions from './Actions.js'

// conversion des mois de la date
const convertDate = (dateStr) => {
  const months = {
    'jan.': 0,
    'fév.': 1,
    'mar.': 2,
    'avr.': 3,
    'mai': 4,
    'juin': 5,
    'juil.': 6,
    'août': 7,
    'sept.': 8,
    'oct.': 9,
    'nov.': 10,
    'déc.': 11
  }
  // on explode et on remet la date au bon format
  const parts = dateStr.split(' ')
  if (parts.length !== 3) return new Date(dateStr)
  const day = parseInt(parts[0])
  const month = months[parts[1].toLowerCase()] || 0
  let year = parseInt(parts[2])
  // on repasse sur 4 chiffres
  year += 2000
  return new Date(year, month, day)
}

const row = (bill) => {
  return (`
    <tr>
      <td>${bill.type}</td>
      <td>${bill.name}</td>
      <td>${bill.date}</td>
      <td>${bill.amount} €</td>
      <td>${bill.status}</td>
      <td>
        ${Actions(bill.fileUrl)}
      </td>
    </tr>
    `)
  }

  const rows = (data) => {
    // Check if 'data' exists and is not empty
    return (data && data.length) 
      // If data exists
      ? data
        // Sort bills from most recent to oldest using date
        .sort((a, b) => {
          return convertDate(b.date) - convertDate(a.date)
        })
        // Transform each bill into an HTML table row
        .map(bill => row(bill))
        // Combine all rows into a single string
        .join("") 
      // else no data, return empty string
      : ""
   }

export default ({ data: bills, loading, error }) => {
  if (loading) {
    return LoadingPage()
  } else if (error) {
    return ErrorPage(error.message)
  }  
  const modal = () => (`
    <div class="modal fade" id="modaleFile" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="exampleModalLongTitle">Justificatif</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
          </div>
        </div>
      </div>
    </div>
  `)

  return (`
    <div class='layout'>
      ${VerticalLayout(120)}
      <div class='content'>
        <div class='content-header'>
          <div class='content-title'> Mes notes de frais </div>
          <button type="button" data-testid='btn-new-bill' class="btn btn-primary">Nouvelle note de frais</button>
        </div>
        <div id="data-table">
        <table id="example" class="table table-striped" style="width:100%">
          <thead>
              <tr>
                <th>Type</th>
                <th>Nom</th>
                <th>Date</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
          </thead>
          <tbody data-testid="tbody">
            ${rows(bills)}
          </tbody>
          </table>
        </div>
      </div>
      ${modal()}
    </div>`
  )
}