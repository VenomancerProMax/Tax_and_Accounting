let account_id, app_id;
let cachedFile = null;
let cachedBase64 = null;

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

    ZOHO.CRM.UI.Resize({ height: "90%" }).then(function (data) {
      console.log("Resize result:", data);
    });
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

function showUploadBuffer() {
  const buffer = document.getElementById("upload-buffer");
  const bar = document.getElementById("upload-progress");
  if (buffer) buffer.classList.remove("hidden");
  if (bar) {
    bar.classList.remove("animate");
    void bar.offsetWidth;
    bar.classList.add("animate");
  }
}

function hideUploadBuffer() {
  const buffer = document.getElementById("upload-buffer");
  if (buffer) buffer.classList.add("hidden");
}

async function cacheFileOnChange(event) {
  clearErrors();

  const fileInput = event.target;
  const file = fileInput?.files[0];

  if (!file) return;

  if (file.size > 20 * 1024 * 1024) {
    showError("corporate-tax-certificate", "File size must not exceed 20MB.");
    return;
  }

  showUploadBuffer();

  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result.split(',')[1]; // Remove data URL prefix
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    cachedFile = file;
    cachedBase64 = base64;

    await new Promise((res) => setTimeout(res, 3000));
    hideUploadBuffer();
  } catch (err) {
    console.error("Error caching file:", err);
    hideUploadBuffer();
    showError("corporate-tax-certificate", "Failed to read file.");
  }
}

async function uploadFileToCRM() {
  if (!cachedFile || !cachedBase64) {
    throw new Error("No cached file");
  }

  return await ZOHO.CRM.API.attachFile({
    Entity: "Applications1",
    RecordID: app_id,
    File: {
      Name: cachedFile.name,
      Content: cachedBase64,
    },
  });
}

function complete_trigger() {
  ZOHO.CRM.BLUEPRINT.proceed();
}

async function update_record(event = null) {
  if (event) event.preventDefault();

  clearErrors();

  let hasError = false;

  const submitBtn = document.getElementById("submit_button_id");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
  }

  const effectiveDate = document.getElementById("effective-date")?.value;
  const dateOfIssue = document.getElementById("date-of-issue")?.value;
  const ctrDueDate = document.getElementById("ctr-due-date")?.value;
  const taxRegNo = document.getElementById("tax-registration-number")?.value;
  const taxPeriodCt = document.getElementById("tax-period-ct")?.value;
  const ctrFinancialYearEnd = document.getElementById("ctr-financial-year-end-date")?.value;

  if (!taxRegNo) {
    showError("tax-registration-number", "Tax Registration Number is required.");
    hasError = true;
  }

  if (!taxPeriodCt) {
    showError("tax-period-ct", "Tax Period is required.");
    hasError = true;
  }

  if (!ctrFinancialYearEnd) {
    showError("ctr-financial-year-end-date", "CTR Financial Year End Date is required.");
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

  if (!cachedFile || !cachedBase64) {
    showError("corporate-tax-certificate", "Please upload the Corporate Tax Certificate.");
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
    const subformData = [];

    if (dateOfIssue) {
      subformData.push({ Type_of_Dates: "Date of Issue", Date: dateOfIssue });
    }

    if (effectiveDate) {
      subformData.push({ Type_of_Dates: "Effective Date of Registration", Date: effectiveDate });
    }

    if (ctrDueDate) {
      subformData.push({ Type_of_Dates: "CTR Due Date", Date: ctrDueDate });
    }

    if (ctrFinancialYearEnd) {
      subformData.push({ Type_of_Dates: "CTR Financial Year End Date", Date: ctrFinancialYearEnd });
    }

    await ZOHO.CRM.API.updateRecord({
      Entity: "Applications1",
      APIData: {
        id: app_id,
        Tax_Registration_Number_TRN: taxRegNo,
        Tax_Period_CT: taxPeriodCt,
        Subform_2: subformData,
        Application_Issuance_Date: dateOfIssue
      }
    });

    await ZOHO.CRM.API.updateRecord({
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

    await uploadFileToCRM();
    await ZOHO.CRM.BLUEPRINT.proceed();
    await ZOHO.CRM.UI.Popup.closeReload();

  } catch (error) {
    console.error("Error on final submit:", error);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  }
}

// ✅ Auto-populate Financial Year End Date by subtracting 9 months and getting last day of that month
function autoPopulateFinancialYearEndDate() {
  const ctrDueDateInput = document.getElementById("ctr-due-date");
  const financialYearEndInput = document.getElementById("ctr-financial-year-end-date");

  ctrDueDateInput.addEventListener("change", () => {
    const dueDateValue = ctrDueDateInput.value;
    if (!dueDateValue) return;

    const dueDate = new Date(dueDateValue);
    const targetMonth = dueDate.getMonth() - 9;
    const targetYear = dueDate.getFullYear();

    const adjustedDate = new Date(targetYear, targetMonth, 1);

    // Get last day of the adjusted month
    const lastDay = new Date(adjustedDate.getFullYear(), adjustedDate.getMonth() + 1, 0);

    const yyyy = lastDay.getFullYear();
    const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
    const dd = String(lastDay.getDate()).padStart(2, '0');

    financialYearEndInput.value = `${yyyy}-${mm}-${dd}`;
  });
}

// Event listeners
document.getElementById("corporate-tax-certificate").addEventListener("change", cacheFileOnChange);
document.getElementById("record-form").addEventListener("submit", update_record);

// Initialize auto-population
autoPopulateFinancialYearEndDate();

async function closeWidget() {
  await ZOHO.CRM.UI.Popup.closeReload().then(console.log);
}

// Initialize the embedded app
ZOHO.embeddedApp.init();