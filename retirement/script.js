


// FUNCTION TO CALCULATE AGE AT SELECTED RETIREMENT YEAR
function calculateRetirementAge() {
  const selectedYear = parseInt(document.getElementById("year").value);
  if (isNaN(selectedYear)) return ""; // Add this check to handle default option
  const retirementAge = selectedYear - new Date(dateOfBirth).getFullYear();
  return retirementAge;
}



// FUNCTION TO CALCULATE REQUIRED INCOME
function calculateIncomeRequired() {
  let incomeRequired;

  // Determine income based on the value of "comfortLevel"
  switch (comfortLevel) {
    case '20k':
      incomeRequired = 20000;
      break;
    case '30k':
      incomeRequired = 30000;
      break;
    case '40k':
      incomeRequired = 40000;
      break;
    case '50k':
      incomeRequired = 50000;
      break;
    default:
      incomeRequired = 0;
    }

  if (london === 'yes') {
    incomeRequired *= (comfortLevel === '20k' ? 1.10 : 1.05);
  }

  return incomeRequired;
}


// FUNCTION TO CALCULATE ADJUSTED REQUIRED INCOME
function calculateAdjustedIncomeRequired() {
  const currentYear = new Date().getFullYear();
  const yearsToRetirement = year - currentYear;
  let adjustedIncomeRequired = calculateIncomeRequired();

  for (let i = 0; i < yearsToRetirement; i++) {
    adjustedIncomeRequired *= 1.025; // Apply 2.5% inflation uplift per year
  }

  return adjustedIncomeRequired;
}



// FUNCTION THAT CALCULATES YEARS UNTIL RETIREMENT
function calculateAndStoreYearsUntilRetirement() {
  const currentYear = new Date().getFullYear();
  const yearOfBirth = parseInt(sessionStorage.getItem('yearOfBirth'));
  const retirementAge = parseInt(sessionStorage.getItem('retirementAge'));
  const yearsUntilRetirement = retirementAge - (currentYear - yearOfBirth);
  sessionStorage.setItem('yearsUntilRetirement', yearsUntilRetirement);
}




// FUNCTION TO CHECK NUMBER OF PENSIONS ADDED - MAXIMUM 5 ALLOWED
function checkMaxEntries() {
  const addButton = document.getElementById('addPotButton');
  const rowIds = JSON.parse(sessionStorage.getItem('pensionPots')) || [];
  if (rowIds.length >= 5) {
    addButton.classList.add('disabled-btn');
    addButton.disabled = true;
  } else {
    addButton.classList.remove('disabled-btn');
    addButton.disabled = false;
  }
}
