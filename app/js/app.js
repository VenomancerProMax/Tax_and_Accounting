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

    // ttaDateSubform = applicationData.Subform_2;
    //   ttaDateSubform.forEach((row, index) => {
    //     const typeOfDate = row.Type_of_Dates;
    //     const date = row.Date;
    //     console.log(row);
    //     console.log(`--- Subform Row ${index + 1} ---`);
    //     console.log("Type of Dates:", typeOfDate);
    //     console.log("Date:", date);
    //   });
} catch (error) {
    console.error("PageLoad error:", error);
  }
});

function clearErrors() {
  document.querySelectorAll(".error-message").forEach(span => {
    span.textContent = "";
  });
}

function showError(fieldId, message) {
  const errorSpan = document.getElementById(`error-${fieldId}`);
  if (errorSpan) errorSpan.textContent = message;
}

let hasError = false;
async function update_record(event = null) {
  if (event) event.preventDefault();

  clearErrors();

  const submitBtn = document.getElementById("submit_button_id");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
  }

  // Step 1: Read input field values
  const effectiveDate = document.getElementById("effective-date")?.value;
  const dateOfIssue = document.getElementById("date-of-issue")?.value;
  const ctrDueDate = document.getElementById("ctr-due-date")?.value;
  const taxRegNo = document.getElementById("tax-registration-number")?.value;
  const taxPeriodCt = document.getElementById("tax-period-ct")?.value;
  const fileInput = document.getElementById("corporate-tax-certificate");
  const file = fileInput.files[0];

  hasError = false;

  // Step 2: Field validations
  if (!taxRegNo) {
    showError("tax-registration-number", "Tax Registration Number is required.");
    hasError = true;
  }
  if (!taxPeriodCt) {
    showError("tax-period-ct", "Tax Period is required.");
    hasError = true;
  }
  if (!effectiveDate) {
    showError("effective-date", "Effective Registration Date is required.");
    hasError = true;
  }
  if (!dateOfIssue) {
    showError("date-of-issue", "Date of Issue is required.");
    hasError = true;
  }
  if (!ctrDueDate) {
    showError("ctr-due-date", "CTR Due Date is required.");
    hasError = true;
  }
  if (!file) {
    showError("corporate-tax-certificate", "Please upload the Corporate Tax Certificate.");
    hasError = true;
  } else if (file.size > 20 * 1024 * 1024) {
    showError("corporate-tax-certificate", "File size must not exceed 20MB.");
    hasError = true;
  }

  if (hasError) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.textContent = "Submitting...";
    }

    // Step 3: Prepare subform data
    const subformData = [];

    if (dateOfIssue) {
      subformData.push({
        Type_of_Dates: "Date of Issue",
        Date: dateOfIssue
      });
    }

    if (effectiveDate) {
      subformData.push({
        Type_of_Dates: "Effective Date of Registration",
        Date: effectiveDate
      });
    }

    if (ctrDueDate) {
      subformData.push({
        Type_of_Dates: "CTR Due Date",
        Date: ctrDueDate
      });
    }

    // Step 4: Update Applications1 record
    const updateAppResp = await ZOHO.CRM.API.updateRecord({
      Entity: "Applications1",
      APIData: {
        id: app_id,
        Tax_Registration_Number_TRN: taxRegNo,
        Tax_Period_CT: taxPeriodCt,
        Subform_2: subformData,
        Application_Issuance_Date: dateOfIssue
      }
    });
    console.log("Updated application record:", updateAppResp);

    // Step 5: Update linked Account record
    const updateAccountResp = await ZOHO.CRM.API.updateRecord({
      Entity: "Accounts",
      APIData: {
        id: account_id,
        Effective_Registration_Date_CT: effectiveDate,
        CT_Return_DD: ctrDueDate,
        Tax_Period_CT: taxPeriodCt,
        Corporate_Tax_TRN: taxRegNo,
        CT_Status: "Active"
      }
    });
    console.log("Updated account record:", updateAccountResp);

    // Step 6: Upload Corporate Tax Certificate
    const reader = new FileReader();
    const fileUploadPromise = new Promise((resolve, reject) => {
      reader.onloadend = async function () {
        try {
          const blob = new Blob([reader.result]);
          const fileResp = await ZOHO.CRM.API.attachFile({
            Entity: "Applications1",
            RecordID: app_id,
            File: {
              Name: file.name,
              Content: blob
            }
          });
          console.log("File upload response:", fileResp);
          resolve(fileResp);
        } catch (uploadErr) {
          console.error("File upload failed:", uploadErr);
          reject(uploadErr);
        }
      };
      reader.onerror = reject;
    });

    reader.readAsArrayBuffer(file);
    await fileUploadPromise;

    // Step 7: Close the popup and proceed
    if(!hasError){
      ZOHO.CRM.BLUEPRINT.proceed()
    }

  } catch (error) {
    console.error("Error in update_record:", error);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  }
}

async function handleCloseOrProceed() {
  await ZOHO.CRM.UI.Popup.close()
        .then(function(data){
      console.log(data)
  })
}

// Initialize the embedded app
ZOHO.embeddedApp.init();