function populateChartData() {

  // INCOME REQUIRED
  let adjustedIncomeRequired = parseInt(sessionStorage.getItem('adjustedIncomeRequired')) || 0;  // Income Required
  const extraIncome = parseInt(sessionStorage.getItem('extraIncome')) || 0;  // Extra Income Amount
  const extraIncomeDuration = parseInt(sessionStorage.getItem('extraIncomeYears')) || 0;  // Extra Income Years

  // STATE PENSION
  let adjustedStatePension = parseInt(sessionStorage.getItem('adjustedStatePension')) || 0;  // State Pension
  const statePensionStartYear = parseInt(sessionStorage.getItem('yearOfBirth')) + 67;  // State Pension

  // PRIVATE PENSIONS
  const SIPP_Value = parseInt(sessionStorage.getItem('totalEstimatedValueAtRetirement')) || 0;  // Private Pension
  const startYear = parseInt(sessionStorage.getItem('selectedRetirementYear')) || 0;    // Private Pension
  const endYear = parseInt(sessionStorage.getItem('yearOfBirth')) + 95 || 0;  // Private Pension
  let taxFreeCash = parseInt(sessionStorage.getItem('taxFreeCash')) || 0;
  let pensionValueAfterTaxFreeCash = parseInt(sessionStorage.getItem('pensionValueAfterTaxFreeCash')) || 0;

  // FINAL SALARY PENSIONS
  let futureAnnualIncome_1 = parseInt(sessionStorage.getItem('futureAnnualIncome_1')) || 0;  // Final Salary Pension 1
  const payableFromYear_1 = parseInt(sessionStorage.getItem('payableFrom_1')) || 0;  // Final Salary Pension 1
  const pensionProvider_1 = sessionStorage.getItem('provider_1') || 'Final Salary Pension 1';  // Final Salary Pension 1
  let futureAnnualIncome_2 = parseInt(sessionStorage.getItem('futureAnnualIncome_2')) || 0;  // Final Salary Pension 2
  const payableFromYear_2 = parseInt(sessionStorage.getItem('payableFrom_2')) || 0;  // Final Salary Pension 2
  const pensionProvider_2 = sessionStorage.getItem('provider_2') || 'Final Salary Pension 2';  // Final Salary Pension 2
  let futureAnnualIncome_3 = parseInt(sessionStorage.getItem('futureAnnualIncome_3')) || 0;  // Final Salary Pension 3
  const payableFromYear_3 = parseInt(sessionStorage.getItem('payableFrom_3')) || 0;  // Final Salary Pension 3
  const pensionProvider_3 = sessionStorage.getItem('provider_3') || 'Final Salary Pension 3';  // Final Salary Pension 3
  let futureAnnualIncome_4 = parseInt(sessionStorage.getItem('futureAnnualIncome_4')) || 0;  // Final Salary Pension 4
  const payableFromYear_4 = parseInt(sessionStorage.getItem('payableFrom_4')) || 0;  // Final Salary Pension 4
  const pensionProvider_4 = sessionStorage.getItem('provider_4') || 'Final Salary Pension 4';  // Final Salary Pension 4
  let futureAnnualIncome_5 = parseInt(sessionStorage.getItem('futureAnnualIncome_5')) || 0;  // Final Salary Pension 5
  const payableFromYear_5 = parseInt(sessionStorage.getItem('payableFrom_5')) || 0;  // Final Salary Pension 5
  const pensionProvider_5 = sessionStorage.getItem('provider_5') || 'Final Salary Pension 5';

  // FINAL SALARY LUMP SUMS
  const lumpSum_1 = parseInt(sessionStorage.getItem('lumpSum_1')) || 0;  // Final Salary Pension Lump Sum 1
  const payableFromLumpSumYear_1 = parseInt(sessionStorage.getItem('payableFrom_1')) || 0;  // Final Salary Pension Lump Sum 1
  const lumpSumProvider_1 = sessionStorage.getItem('lumpSumProvider_1') || 'Pension Lump Sum 1';  // Final Salary Pension Lump Sum 1
  const lumpSum_2 = parseInt(sessionStorage.getItem('lumpSum_2')) || 0;  // Final Salary Pension Lump Sum 2
  const payableFromLumpSumYear_2 = parseInt(sessionStorage.getItem('payableFrom_2')) || 0;  // Final Salary Pension Lump Sum 2
  const lumpSumProvider_2 = sessionStorage.getItem('lumpSumProvider_2') || 'Pension Lump Sum 2';  // Final Salary Pension Lump Sum 2
  const lumpSum_3 = parseInt(sessionStorage.getItem('lumpSum_3')) || 0;  // Final Salary Pension Lump Sum 3
  const payableFromLumpSumYear_3 = parseInt(sessionStorage.getItem('payableFrom_3')) || 0;  // Final Salary Pension Lump Sum 3
  const lumpSumProvider_3 = sessionStorage.getItem('lumpSumProvider_3') || 'Pension Lump Sum 3';  // Final Salary Pension Lump Sum 3
  const lumpSum_4 = parseInt(sessionStorage.getItem('lumpSum_4')) || 0;  // Final Salary Pension Lump Sum 4
  const payableFromLumpSumYear_4 = parseInt(sessionStorage.getItem('payableFrom_4')) || 0;  // Final Salary Pension Lump Sum 4
  const lumpSumProvider_4 = sessionStorage.getItem('lumpSumProvider_4') || 'Pension Lump Sum 4';  // Final Salary Pension Lump Sum 4
  const lumpSum_5 = parseInt(sessionStorage.getItem('lumpSum_5')) || 0;  // Final Salary Pension Lump Sum 5
  const payableFromLumpSumYear_5 = parseInt(sessionStorage.getItem('payableFrom_5')) || 0;  // Final Salary Pension Lump Sum 5
  const lumpSumProvider_5 = sessionStorage.getItem('lumpSumProvider_5') || 'Pension Lump Sum 5';

  // INVESTMENTS
  let totalInvestmentValueAtRetirement = parseInt(sessionStorage.getItem('totalInvestmentValueAtRetirement')) || 0;

  // OTHER INCOME
  const otherIncomes = JSON.parse(sessionStorage.getItem('IncomePots')) || [];  // Other Incomes (data into array)
  const firstOtherIncomeSource = sessionStorage.getItem('firstOtherIncomeSource') || 'Other Income 1';  // Other Income Labels
  const secondOtherIncomeSource = sessionStorage.getItem('secondOtherIncomeSource') || 'Other Income 2';  // Other Income Labels
  const thirdOtherIncomeSource = sessionStorage.getItem('thirdOtherIncomeSource') || 'Other Income 3';  // Other Income Labels
  const fourthOtherIncomeSource = sessionStorage.getItem('fourthOtherIncomeSource') || 'Other Income 4';  // Other Income Labels
  const fifthOtherIncomeSource = sessionStorage.getItem('fifthOtherIncomeSource') || 'Other Income 5';  // Other Income Labels

  // CASH
  const estimatedCashValueAtRetirement_1 = parseInt(sessionStorage.getItem('estimatedCashValueAtRetirement_1')) || 0;
  const estimatedCashValueAtRetirement_2 = parseInt(sessionStorage.getItem('estimatedCashValueAtRetirement_2')) || 0;
  const estimatedCashValueAtRetirement_3 = parseInt(sessionStorage.getItem('estimatedCashValueAtRetirement_3')) || 0;
  const estimatedCashValueAtRetirement_4 = parseInt(sessionStorage.getItem('estimatedCashValueAtRetirement_4')) || 0;
  const estimatedCashValueAtRetirement_5 = parseInt(sessionStorage.getItem('estimatedCashValueAtRetirement_5')) || 0;
  const yearCashReceived_1 = parseInt(sessionStorage.getItem('YearCashReceived_1')) || 0;
  const yearCashReceived_2 = parseInt(sessionStorage.getItem('YearCashReceived_2')) || 0;
  const yearCashReceived_3 = parseInt(sessionStorage.getItem('YearCashReceived_3')) || 0;
  const yearCashReceived_4 = parseInt(sessionStorage.getItem('YearCashReceived_4')) || 0;
  const yearCashReceived_5 = parseInt(sessionStorage.getItem('YearCashReceived_5')) || 0;
  const cashProvider_1 = sessionStorage.getItem('cashProvider_1') || 'Estimated Cash Value at Retirement 1';
  const cashProvider_2 = sessionStorage.getItem('cashProvider_2') || 'Estimated Cash Value at Retirement 2';
  const cashProvider_3 = sessionStorage.getItem('cashProvider_2') || 'Estimated Cash Value at Retirement 3';
  const cashProvider_4 = sessionStorage.getItem('cashProvider_2') || 'Estimated Cash Value at Retirement 4';
  const cashProvider_5 = sessionStorage.getItem('cashProvider_2') || 'Estimated Cash Value at Retirement 5';

  // CREATE ARRAYS FOR CHART DATA
  const labels = [];
  const finalSalaryData = [];
  const statePensionData = [];
  const fixedValueData = [];
  const dbLumpSumData = [];
  const otherIncomeDataSets = {};
  const shortfallData = [];
  const isaWithdrawalData = [];
  const pensionWithdrawalData = [];
  const remainingPensionData = [];
  const cashWithdrawalData = [];
  const taxFreeCashData = [];
  const finalSalaryData_1 = [];
  const finalSalaryData_2 = [];
  const finalSalaryData_3 = [];
  const finalSalaryData_4 = [];
  const finalSalaryData_5 = [];
  const lumpSumData_1 = [];
  const lumpSumData_2 = [];
  const lumpSumData_3 = [];
  const lumpSumData_4 = [];
  const lumpSumData_5 = [];
  const cashWithdrawalDataSets = [];
  const estimatedCashData_1 = [];
  const estimatedCashData_2 = [];
  const estimatedCashData_3 = [];
  const estimatedCashData_4 = [];
  const estimatedCashData_5 = [];
  const remainingSavingsAndInvestmentsData = [];
  const remainingTaxFreeCashData = [];
  const remainingCashValueData_1 = [];
  const remainingCashValueData_2 = [];
  const remainingCashValueData_3 = [];
  const remainingCashValueData_4 = [];
  const remainingCashValueData_5 = [];



  // WHAT IS THIS FOR?
  let initialAdjustedStatePension = adjustedStatePension;



  // POPULATE OTHER INCOME ARRAY
  otherIncomes.forEach(income => {
    otherIncomeDataSets[income.id] = {
        label: income.otherIncomeSource,
        data: [],
        backgroundColor: '#C05761',
        order: 6
      };
    });



  // Distribute the new cash values across the years
  // BETTER DESCRIPTION NEEDED
  let remainingCashValue_1 = estimatedCashValueAtRetirement_1;
  let remainingCashValue_2 = estimatedCashValueAtRetirement_2;
  let remainingCashValue_3 = estimatedCashValueAtRetirement_3;
  let remainingCashValue_4 = estimatedCashValueAtRetirement_4;
  let remainingCashValue_5 = estimatedCashValueAtRetirement_5;

  // LOOP THROUGH THE RETIREMENT YEARS AND POPULATE REMAINING ARRAYS
  for (let year = startYear; year <= endYear; year++) {
    labels.push(year);
    let totalIncome = 0;

    // ADD DATA INTO INCOME REQUIRED ARRAY
    let incomeRequired;
    if (year - startYear < extraIncomeDuration) {
        incomeRequired = adjustedIncomeRequired + extraIncome;
      } else {
        incomeRequired = adjustedIncomeRequired;
      }
      fixedValueData.push(incomeRequired);

      // ADD DATA INTO STATE PENSION ARRAY
      if (year >= statePensionStartYear) {
        statePensionData.push(initialAdjustedStatePension);
        totalIncome += initialAdjustedStatePension;
        initialAdjustedStatePension *= 1.025;
      } else {
        statePensionData.push(0);
      }

      // ADD DATA INTO FINAL SALARY 1 ARRAY
      if (year >= payableFromYear_1) {
        finalSalaryData_1.push(futureAnnualIncome_1);
        totalIncome += futureAnnualIncome_1;
      } else {
        finalSalaryData_1.push(0);
      }

      // ADD DATA INTO FINAL SALARY 2 ARRAY
      if (year >= payableFromYear_2) {
        finalSalaryData_2.push(futureAnnualIncome_2);
        totalIncome += futureAnnualIncome_2;
      } else {
        finalSalaryData_2.push(0);
      }

      // ADD DATA INTO FINAL SALARY 3 ARRAY
      if (year >= payableFromYear_3) {
        finalSalaryData_3.push(futureAnnualIncome_3);
        totalIncome += futureAnnualIncome_3;
      } else {
        finalSalaryData_3.push(0);
      }

      // ADD DATA INTO FINAL SALARY 4 ARRAY
      if (year >= payableFromYear_4) {
        finalSalaryData_4.push(futureAnnualIncome_4);
        totalIncome += futureAnnualIncome_4;
      } else {
        finalSalaryData_4.push(0);
      }

      // ADD DATA INTO FINAL SALARY 5 ARRAY
      if (year >= payableFromYear_5) {
        finalSalaryData_5.push(futureAnnualIncome_5);
        totalIncome += futureAnnualIncome_5;
      } else {
        finalSalaryData_5.push(0);
      }

      // ADD DATA INTO FINAL SALARY PENSON 1 LUMP SUM ARRAY
      if (year === payableFromLumpSumYear_1) {
        lumpSumData_1.push(lumpSum_1);
        totalIncome += lumpSum_1;
      } else {
        lumpSumData_1.push(0);
      }

      // ADD DATA INTO FINAL SALARY PENSON 2 LUMP SUM ARRAY
      if (year === payableFromLumpSumYear_2) {
        lumpSumData_2.push(lumpSum_2);
        totalIncome += lumpSum_2;
      } else {
        lumpSumData_2.push(0);
      }

      // ADD DATA INTO FINAL SALARY PENSON 3 LUMP SUM ARRAY
      if (year === payableFromLumpSumYear_3) {
        lumpSumData_3.push(lumpSum_3);
        totalIncome += lumpSum_3;
      } else {
        lumpSumData_3.push(0);
      }

      // ADD DATA INTO FINAL SALARY PENSON 4 LUMP SUM ARRAY
      if (year === payableFromLumpSumYear_4) {
        lumpSumData_4.push(lumpSum_4);
        totalIncome += lumpSum_4;
      } else {
        lumpSumData_4.push(0);
      }

      // ADD DATA INTO FINAL SALARY PENSON 5 LUMP SUM ARRAY
      if (year === payableFromLumpSumYear_5) {
        lumpSumData_5.push(lumpSum_5);
        totalIncome += lumpSum_5;
      } else {
        lumpSumData_5.push(0);
      }

      // OTHER INCOMES BAR
      otherIncomes.forEach(income => {
        let incomeValue = 0;
        if (year >= income.otherIncomeStartYear && year <= income.otherIncomeEndYear) {
            incomeValue = income.otherIncomeEstimatedValueAtRetirement;
            totalIncome += incomeValue;
            income.otherIncomeEstimatedValueAtRetirement *= 1.025;
          }
          otherIncomeDataSets[income.id].data.push(incomeValue);
        });

        // ADD DATA INTO CASH_1 ARRAY - AND CALCULATE REMAINING CASH
        let cashFromEstimated_1 = 0;
        if (remainingCashValue_1 > 0 && year >= yearCashReceived_1) {
          cashFromEstimated_1 = Math.min(remainingCashValue_1, incomeRequired - totalIncome);
          remainingCashValue_1 -= cashFromEstimated_1;
          totalIncome += cashFromEstimated_1;
        }
        estimatedCashData_1.push(cashFromEstimated_1);
        remainingCashValueData_1.push(remainingCashValue_1.toFixed(2)); // Update remaining cash value 1 data

        // ADD DATA INTO CASH_2 ARRAY - AND CALCULATE REMAINING CASH
        let cashFromEstimated_2 = 0;
        if (remainingCashValue_2 > 0 && year >= yearCashReceived_2) {
          cashFromEstimated_2 = Math.min(remainingCashValue_2, incomeRequired - totalIncome);
          remainingCashValue_2 -= cashFromEstimated_2;
          totalIncome += cashFromEstimated_2;
        }
        estimatedCashData_2.push(cashFromEstimated_2);
        remainingCashValueData_2.push(remainingCashValue_2.toFixed(2)); // Update remaining cash value 2 data

        // ADD DATA INTO CASH_3 ARRAY - AND CALCULATE REMAINING CASH
        let cashFromEstimated_3 = 0;
        if (remainingCashValue_3 > 0 && year >= yearCashReceived_3) {
          cashFromEstimated_3 = Math.min(remainingCashValue_3, incomeRequired - totalIncome);
          remainingCashValue_3 -= cashFromEstimated_3;
          totalIncome += cashFromEstimated_3;
        }
        estimatedCashData_3.push(cashFromEstimated_3);
        remainingCashValueData_3.push(remainingCashValue_3.toFixed(2)); // Update remaining cash value 3 data

        // ADD DATA INTO CASH_4 ARRAY - AND CALCULATE REMAINING CASH
        let cashFromEstimated_4 = 0;
        if (remainingCashValue_4 > 0 && year >= yearCashReceived_4) {
          cashFromEstimated_4 = Math.min(remainingCashValue_4, incomeRequired - totalIncome);
          remainingCashValue_4 -= cashFromEstimated_4;
          totalIncome += cashFromEstimated_4;
        }
        estimatedCashData_4.push(cashFromEstimated_4);
        remainingCashValueData_4.push(remainingCashValue_4.toFixed(2)); // Update remaining cash value 4 data

        // ADD DATA INTO CASH_5 ARRAY - AND CALCULATE REMAINING CASH
        let cashFromEstimated_5 = 0;
        if (remainingCashValue_5 > 0 && year >= yearCashReceived_5) {
          cashFromEstimated_5 = Math.min(remainingCashValue_5, incomeRequired - totalIncome);
          remainingCashValue_5 -= cashFromEstimated_5;
          totalIncome += cashFromEstimated_5;
        }
        estimatedCashData_5.push(cashFromEstimated_5);
        remainingCashValueData_5.push(remainingCashValue_5.toFixed(2)); // Update remaining cash value 5 data

        // ADD DATA INTO SAVINGS & INBESTMENT ARRAY
        let isaWithdrawal = Math.max(0, incomeRequired - totalIncome);
        if (isaWithdrawal > totalInvestmentValueAtRetirement) {
          isaWithdrawal = totalInvestmentValueAtRetirement;
        }
        isaWithdrawalData.push(isaWithdrawal);
        totalIncome += isaWithdrawal;
        totalInvestmentValueAtRetirement -= isaWithdrawal;
        remainingSavingsAndInvestmentsData.push(totalInvestmentValueAtRetirement.toFixed(2)); // Update remaining savings and investments data

        // ADD DATA INTO PERSONAL PENSION ARRAY - AND CALCULATE REMAINING VALUE
        let pensionWithdrawal = Math.max(0, incomeRequired - totalIncome);
        if (pensionWithdrawal > pensionValueAfterTaxFreeCash) {
          pensionWithdrawal = pensionValueAfterTaxFreeCash;
        }
        pensionWithdrawalData.push(pensionWithdrawal);
        totalIncome += pensionWithdrawal;
        pensionValueAfterTaxFreeCash -= pensionWithdrawal;

        // ADD DATA INTO PERSONAL PENSION TAX FREE CASH ARRAY - AND CALCULATE REMAINING VALUE
        let taxFreeCashWithdrawal = Math.max(0, incomeRequired - totalIncome);
        if (taxFreeCashWithdrawal > taxFreeCash) {
          taxFreeCashWithdrawal = taxFreeCash;
        }
        taxFreeCashData.push(taxFreeCashWithdrawal);
        totalIncome += taxFreeCashWithdrawal;
        taxFreeCash -= taxFreeCashWithdrawal;

        remainingPensionData.push(pensionValueAfterTaxFreeCash.toFixed(2));
        remainingTaxFreeCashData.push(taxFreeCash.toFixed(2)); // Update remaining tax free cash data

        // CALCULATE THE YEAR IN WHICH THE FIRST SHORTFALL OCCURS
          const shortfall = Math.max(0, incomeRequired - totalIncome);
  shortfallData.push(shortfall);

    // UPLIFT POT VALUES ON AN ANNUAL BASIS
    adjustedIncomeRequired *= 1.025;
    pensionValueAfterTaxFreeCash *= 1.025;
    futureAnnualIncome_1 *= 1.025;
    futureAnnualIncome_2 *= 1.025;
    futureAnnualIncome_3 *= 1.025;
    futureAnnualIncome_4 *= 1.025;
    futureAnnualIncome_5 *= 1.025;
    totalInvestmentValueAtRetirement *= 1.025;
  }

  // DETERMINE THEY YEAR OF THE FIRST SHORTFALL
  let shortfallYear = null;
  for (let i = 0; i < shortfallData.length; i++) {
    if (shortfallData[i] > 0) {
        shortfallYear = labels[i];
        break;
      }
    }

    // CALCULATE AGE AT FIRST INCOME SHORTFALL
    const yearOfBirth = parseInt(sessionStorage.getItem('yearOfBirth')) || 0;
    let shortfallAge = shortfallYear ? shortfallYear - yearOfBirth : null;

    // DISPLAY SHORTFALL MESSAGE
    const shortfallMessageElement = document.getElementById("shortfallMessage");
    if (shortfallYear) {
      shortfallMessageElement.innerHTML = `You will have a shortfall of funds by ${shortfallYear}. You will be ${shortfallAge} years old at that time.<br><br>Use the tools below to adjust your income requirements, or increase your savings.`;
    } else {
      shortfallMessageElement.innerHTML = "Congratulations! You should have enough funds to see you through your retirement.";
    }

    // OUTPUT ARRAYS INTO CHART DATASETS
    const datasets = [
      {
        label: 'State Pension',
        backgroundColor: '#734F5A',
        data: statePensionData,
        order: 3
      },
      {
        label: pensionProvider_1 + ' Pension',
        backgroundColor: '#264653',
        data: finalSalaryData_1,
        order: 5
      },
      {
        label: pensionProvider_2 + ' Pension',
        backgroundColor: '#264653',
        data: finalSalaryData_2,
        order: 6
      },
      {
        label: pensionProvider_3 + ' Pension',
        backgroundColor: '#264653',
        data: finalSalaryData_3,
        order: 7
      },
      {
        label: pensionProvider_4 + ' Pension',
        backgroundColor: '#264653',
        data: finalSalaryData_4,
        order: 8
      },
      {
        label: pensionProvider_5 + ' Pension',
        backgroundColor: '#264653',
        data: finalSalaryData_5,
        order: 9
      },
      {
        label: pensionProvider_1 + ' Pension Lump Sum',
        backgroundColor: '#2A9D8F',
        data: lumpSumData_1,
        order: 10
      },
      {
        label: pensionProvider_2 + ' Pension Lump Sum',
        backgroundColor: '#2A9D8F',
        data: lumpSumData_2,
        order: 11
      },
      {
        label: pensionProvider_3 + ' Pension Lump Sum',
        backgroundColor: '#2A9D8F',
        data: lumpSumData_3,
        order: 12
      },
      {
        label: pensionProvider_4 + ' Pension Lump Sum',
        backgroundColor: '#2A9D8F',
        data: lumpSumData_4,
        order: 13
      },
      {
        label: pensionProvider_5 + ' Pension Lump Sum',
        backgroundColor: '#2A9D8F',
        data: lumpSumData_5,
        order: 14
      }
    ];

    // ADD OTHER INCOME DATASET
    Object.values(otherIncomeDataSets).forEach(dataset => {
      datasets.push(dataset);
    });

    datasets.push(
      {
        label: 'Savings & Investments',
        backgroundColor: '#E76F51',
        data: isaWithdrawalData,
        order: 15
      },
      {
        label: 'Private Pensions',
        backgroundColor: '#E9C46A',
        data: pensionWithdrawalData,
        order: 16
      },
      {
        label: 'Private Pensions Tax Free Cash',
        backgroundColor: '#F4A261',
        data: taxFreeCashData,
        order: 17
      },
      {
        label: 'Cash from ' + cashProvider_1,
        backgroundColor: '#941C2F',
        data: estimatedCashData_1,
        order: 18
      },
      {
        label: 'Cash from ' + cashProvider_2,
        backgroundColor: '#941C2F',
        data: estimatedCashData_2,
        order: 19
      },
      {
        label: 'Cash from ' + cashProvider_3,
        backgroundColor: '#941C2F',
        data: estimatedCashData_3,
        order: 19
      },
      {
        label: 'Cash from ' + cashProvider_4,
        backgroundColor: '#941C2F',
        data: estimatedCashData_4,
        order: 19
      },
      {
        label: 'Cash from ' + cashProvider_5,
        backgroundColor: '#941C2F',
        data: estimatedCashData_5,
        order: 19
      },
      {
        label: 'Shortfall',
        backgroundColor: 'transparent',
        data: shortfallData,
        order: 20
          },
          {
            label: 'Income Target',
            backgroundColor: 'black',
            type: 'line',
            data: fixedValueData,
            fill: false,
            borderColor: 'black',
            borderWidth: 2,
            pointRadius: 0,
            order: 1
          }
    );

  // CREATE CHART
  const ctx = document.getElementById("bar-chart").getContext("2d");
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      plugins: {
        legend: {
          display: false
          },
          tooltip: {
            callbacks: {
              label: function (tooltipItem) {
                let label = tooltipItem.dataset.label || '';
                let value = tooltipItem.raw;
                let formattedValue = '£' + value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                return [label, formattedValue];
                }
              }
            }
          },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'Year'
          }
        },
        y: {
          stacked: true,
            title: {
              display: true,
              text: 'Annual Income'
            },
            ticks: {
              callback: function (value) {
                return '£' + value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
              }
            }
        }
      }
    }
  });
