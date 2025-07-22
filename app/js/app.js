// Initialize the embedded app
ZOHO.embeddedApp.init();

let account_id, app_id;

ZOHO.embeddedApp.on("PageLoad", async (entity) => {
try {
    const entity_id = entity.EntityId;
  
    const appResponse = await ZOHO.CRM.API.getRecord({
      Entity: "Applications1",
      approved: "both",
      RecordID: entity_id,
    });

    const applicationData = appResponse.data[0];
    app_id = applicationData.id;
    account_id = applicationData.Account_Name.id;

    ttaDateSubform = applicationData.Subform_2;

      ttaDateSubform.forEach((row, index) => {
        const typeOfDate = row.Type_of_Dates;
        const date = row.Date;
        console.log(row);

        console.log(`--- Subform Row ${index + 1} ---`);
        console.log("Type of Dates:", typeOfDate);
        console.log("Date:", date);
      });

      console.log(applicationData);

    

    const accountResponse = await ZOHO.CRM.API.getRecord({
      Entity: "Accounts",
      approved: "both",
      RecordID: account_id,
    });

} catch (error) {
    console.error("PageLoad error:", error);
  }
});

async function update_record(event = null) {
  if (event) event.preventDefault();

  const submitBtn = document.getElementById("submit_button_id");

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

    // Get new values from input fields
    const effectiveDate = document.getElementById("effective-date").value;
    const dateOfIssue = document.getElementById("date-of-issue").value;
    const ctrDueDate = document.getElementById("ctr-due-date").value;

    // Step 1: Get full application record (to get subform row IDs)
    const getRecordResp = await ZOHO.CRM.API.getRecord({
      Entity: "Applications1",
      id: app_id
    });

    const appRecord = getRecordResp.data[0];
    const originalSubform = appRecord.Subform_2 || [];

    // Step 2: Create updated subform
    const updatedSubform = originalSubform
      .filter(row => row.id) // Only include rows that have an ID
      .map(row => {
        const type = row.Type_of_Dates;
        const updatedRow = { id: row.id };

        if (type === "Effective Date of Registration") {
          updatedRow.Date = effectiveDate;
        } else if (type === "Date of Issue") {
          updatedRow.Date = dateOfIssue;
        } else if (type === "1st CTR Due Date") {
          updatedRow.Date = ctrDueDate;
        } else {
          updatedRow.Date = row.Date;
        }

        return updatedRow;
      });

      console.log("SUBFORM UPDATE ",updatedSubform);


    // Step 3: Update the record
    const updateResp = await ZOHO.CRM.API.updateRecord({
      Entity: "Applications1",
      APIData: {
        id: app_id,
        Subform_2: updatedSubform
      }
    });

    console.log("Updated record response:", updateResp);
  } catch (error) {
    console.error("Error updating record:", error);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  }
}


function hidePopup() {
  ZOHO.CRM.UI.Popup.closeReload()
  // ZOHO.CRM.UI.Popup.close();
}


