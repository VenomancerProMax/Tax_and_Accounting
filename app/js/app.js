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


async function update_record(event = null) {
  if (event) event.preventDefault();

  clearErrors();

  const submitBtn = document.getElementById("submit_button_id");

  if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
  }


  // Step 1: Read new values from the input fields
  const effectiveDate = document.getElementById("effective-date").value;
  const dateOfIssue = document.getElementById("date-of-issue").value;
  const ctrDueDate = document.getElementById("ctr-due-date").value;
  const taxRegNo = document.getElementById("tax-registration-number").value;
  const taxPeriodCt = document.getElementById("tax-period-ct").value;

    
  let hasError = false;

  // Validate mandatory fields
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
    
    // Step 2: Prepare new subform rows
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

    // Step 3: Update the record with new subform data
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
    console.log("Updated record response:", updateAppResp);


    // Step 4: Update the account  [Effective_Registration_Date_VAT: dateOfIssue,]
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
    console.log("Updated account response:", updateAccountResp);

    hidePopup();

  } catch (error) {
    console.error("Error updating record:", error);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  }
}

async function hidePopup() {
  try {
    const proceedResp = await ZOHO.CRM.BLUEPRINT.proceed();
    console.log("Blueprint proceed response:", proceedResp);
  } catch (bpError) {
    console.error("Error proceeding in Blueprint:", bpError);
  } finally {
    ZOHO.CRM.UI.Popup.closeReload();
  }
}



// Initialize the embedded app
ZOHO.embeddedApp.init();