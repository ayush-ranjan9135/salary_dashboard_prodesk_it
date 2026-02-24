// ============================================
// CASH-FLOW TRACKER - MODULAR ARCHITECTURE
// ============================================

// ============================================
// STATE MANAGEMENT
// ============================================
const AppState = {
    salary: 0,
    expenses: [],
    baseCurrency: 'INR',
    exchangeRate: 1,
    filteredExpenses: []
};

// ============================================
// CONSTANTS
// ============================================
const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€' };
const ANIMATION_DURATION = 1000;
const TOAST_DURATION = 3000;
const BUDGET_ALERT_THRESHOLD = 0.2;

// ============================================
// DOM ELEMENTS CACHE
// ============================================
const DOM = {
    salaryInput: document.getElementById('salaryInput'),
    expenseName: document.getElementById('expenseName'),
    expenseAmount: document.getElementById('expenseAmount'),
    expenseCategory: document.getElementById('expenseCategory'),
    currencySelect: document.getElementById('currencySelect'),
    searchExpense: document.getElementById('searchExpense'),
    filterCategory: document.getElementById('filterCategory'),
    fileInput: document.getElementById('fileInput'),
    salaryDisplay: document.getElementById('salaryDisplay'),
    expenseDisplay: document.getElementById('expenseDisplay'),
    balanceDisplay: document.getElementById('balanceDisplay'),
    expenseList: document.getElementById('expenseList'),
    errorMessage: document.getElementById('errorMessage'),
    salaryErrorMessage: document.getElementById('salaryErrorMessage'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    progressLabel: document.getElementById('progressLabel'),
    highestExpense: document.getElementById('highestExpense'),
    averageExpense: document.getElementById('averageExpense'),
    mostUsedCategory: document.getElementById('mostUsedCategory'),
    setSalaryBtn: document.getElementById('setSalaryBtn'),
    addExpenseBtn: document.getElementById('addExpenseBtn'),
    downloadPdfBtn: document.getElementById('downloadPdfBtn'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    importJsonBtn: document.getElementById('importJsonBtn'),
    resetMonthBtn: document.getElementById('resetMonthBtn'),
    themeToggle: document.getElementById('themeToggle'),
    budgetAlert: document.getElementById('budgetAlert'),
    confirmModal: document.getElementById('confirmModal'),
    cancelReset: document.getElementById('cancelReset'),
    confirmReset: document.getElementById('confirmReset'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
};

let chart = null;

// ============================================
// EXPENSE CONTROLLER
// ============================================
const ExpenseController = {
    handleSalaryInput() {
        const value = parseFloat(DOM.salaryInput.value) || 0;
        
        if (!DOM.salaryInput.value || DOM.salaryInput.value.trim() === '') {
            DOM.salaryErrorMessage.textContent = 'Please enter a salary amount';
            return;
        }
        
        if (value < 0) {
            DOM.salaryErrorMessage.textContent = 'Salary cannot be negative';
            return;
        }
        
        if (value === 0) {
            DOM.salaryErrorMessage.textContent = 'Salary must be greater than zero';
            return;
        }
        
        AppState.salary = value;
        StorageManager.save();
        UIUpdater.updateAll();
        DOM.salaryErrorMessage.textContent = '';
        DOM.salaryInput.value = '';
        UIHelper.showToast('Salary updated successfully!');
    },
    
    addExpense() {
        const name = DOM.expenseName.value.trim();
        const amount = parseFloat(DOM.expenseAmount.value);
        const category = DOM.expenseCategory.value;
        
        if (!name) {
            UIHelper.showError('Please enter expense name');
            return;
        }
        if (!amount || amount <= 0 || isNaN(amount)) {
            UIHelper.showError('Please enter a valid amount');
            return;
        }
        
        AppState.expenses.push({
            id: Date.now(),
            name,
            amount,
            category,
            date: new Date().toISOString()
        });
        
        DOM.expenseName.value = '';
        DOM.expenseAmount.value = '';
        UIHelper.clearError();
        StorageManager.save();
        UIUpdater.updateAll();
        UIHelper.showToast('Expense added successfully!');
    },
    
    deleteExpense(id) {
        AppState.expenses = AppState.expenses.filter(exp => exp.id !== id);
        StorageManager.save();
        UIUpdater.updateAll();
        UIHelper.showToast('Expense deleted!');
    },
    
    filterExpenses() {
        const searchTerm = DOM.searchExpense.value.toLowerCase();
        const categoryFilter = DOM.filterCategory.value;
        
        AppState.filteredExpenses = AppState.expenses.filter(expense => {
            const matchesSearch = expense.name.toLowerCase().includes(searchTerm);
            const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
        
        ExpenseRenderer.render();
    },
    
    calculateTotal() {
        return AppState.expenses.reduce((total, exp) => total + exp.amount, 0);
    }
};

// ============================================
// EXPENSE RENDERER
// ============================================
const ExpenseRenderer = {
    render() {
        const expensesToRender = AppState.filteredExpenses.length > 0 || DOM.searchExpense.value || DOM.filterCategory.value !== 'All' 
            ? AppState.filteredExpenses 
            : AppState.expenses;
        
        if (expensesToRender.length === 0) {
            DOM.expenseList.innerHTML = `
                <div class="empty-state-container">
                    <i class="fas fa-receipt empty-icon"></i>
                    <p class="empty-state">No expenses yet. Start tracking your spending!</p>
                </div>
            `;
            return;
        }
        
        DOM.expenseList.innerHTML = '';
        expensesToRender.forEach(expense => {
            const date = new Date(expense.date);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const expenseItem = document.createElement('div');
            expenseItem.className = 'expense-item';
            expenseItem.innerHTML = `
                <div class="expense-info">
                    <h4>
                        ${expense.name}
                        <span class="category-badge category-${expense.category}">${expense.category}</span>
                    </h4>
                    <p>${CURRENCY_SYMBOLS[AppState.baseCurrency]}${(expense.amount * AppState.exchangeRate).toFixed(2)}</p>
                    <div class="expense-meta">${formattedDate}</div>
                </div>
                <button class="delete-btn" onclick="ExpenseController.deleteExpense(${expense.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            DOM.expenseList.appendChild(expenseItem);
        });
    }
};

// ============================================
// UI UPDATER
// ============================================
const UIUpdater = {
    updateAll() {
        this.updateSummaryCards();
        ExpenseRenderer.render();
        ChartManager.update();
        InsightsManager.update();
        ProgressManager.update();
        this.checkBudgetAlert();
    },
    
    updateSummaryCards() {
        const totalExpenses = ExpenseController.calculateTotal();
        const remainingBalance = AppState.salary - totalExpenses;
        
        Animator.animateNumber(DOM.salaryDisplay, 0, AppState.salary * AppState.exchangeRate, CURRENCY_SYMBOLS[AppState.baseCurrency]);
        Animator.animateNumber(DOM.expenseDisplay, 0, totalExpenses * AppState.exchangeRate, CURRENCY_SYMBOLS[AppState.baseCurrency]);
        Animator.animateNumber(DOM.balanceDisplay, 0, remainingBalance * AppState.exchangeRate, CURRENCY_SYMBOLS[AppState.baseCurrency]);
    },
    
    checkBudgetAlert() {
        const totalExpenses = ExpenseController.calculateTotal();
        const remainingBalance = AppState.salary - totalExpenses;
        const threshold = AppState.salary * BUDGET_ALERT_THRESHOLD;
        
        if (AppState.salary > 0 && remainingBalance < threshold && remainingBalance >= 0) {
            DOM.budgetAlert.style.display = 'flex';
            DOM.balanceDisplay.classList.add('balance-warning');
        } else {
            DOM.budgetAlert.style.display = 'none';
            DOM.balanceDisplay.classList.remove('balance-warning');
        }
    }
};

// ============================================
// ANIMATOR
// ============================================
const Animator = {
    animateNumber(element, start, end, symbol) {
        const startTime = performance.now();
        
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = start + (end - start) * easeOutQuart;
            
            element.textContent = `${symbol}${current.toFixed(2)}`;
            
            if (progress < 1) requestAnimationFrame(update);
        };
        
        requestAnimationFrame(update);
    }
};

// ============================================
// PROGRESS MANAGER
// ============================================
const ProgressManager = {
    update() {
        if (AppState.salary === 0) {
            DOM.progressBar.style.strokeDashoffset = 220;
            DOM.progressText.textContent = '0%';
            DOM.progressLabel.textContent = 'No Budget';
            DOM.progressBar.style.stroke = '#64748b';
            return;
        }
        
        const totalExpenses = ExpenseController.calculateTotal();
        const percentage = Math.min((totalExpenses / AppState.salary) * 100, 100);
        const offset = 220 - (220 * percentage) / 100;
        
        DOM.progressBar.style.strokeDashoffset = offset;
        DOM.progressText.textContent = `${Math.round(percentage)}%`;
        
        if (percentage < 50) {
            DOM.progressBar.style.stroke = '#00D4AA';
            DOM.progressLabel.textContent = 'Healthy';
        } else if (percentage < 80) {
            DOM.progressBar.style.stroke = '#FFB800';
            DOM.progressLabel.textContent = 'Moderate';
        } else {
            DOM.progressBar.style.stroke = '#FF6B6B';
            DOM.progressLabel.textContent = 'High';
        }
    }
};

// ============================================
// INSIGHTS MANAGER
// ============================================
const InsightsManager = {
    update() {
        if (AppState.expenses.length === 0) {
            DOM.highestExpense.textContent = '-';
            DOM.averageExpense.textContent = '-';
            DOM.mostUsedCategory.textContent = '-';
            document.getElementById('hotelBills').textContent = '-';
            return;
        }
        
        const highest = AppState.expenses.reduce((max, exp) => exp.amount > max.amount ? exp : max, AppState.expenses[0]);
        DOM.highestExpense.textContent = `${highest.name} (${CURRENCY_SYMBOLS[AppState.baseCurrency]}${(highest.amount * AppState.exchangeRate).toFixed(2)})`;
        
        const average = ExpenseController.calculateTotal() / AppState.expenses.length;
        DOM.averageExpense.textContent = `${CURRENCY_SYMBOLS[AppState.baseCurrency]}${(average * AppState.exchangeRate).toFixed(2)}`;
        
        const categoryCount = {};
        AppState.expenses.forEach(exp => categoryCount[exp.category] = (categoryCount[exp.category] || 0) + 1);
        const mostUsed = Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b);
        DOM.mostUsedCategory.textContent = `${mostUsed} (${categoryCount[mostUsed]}x)`;
        
        const hotelExpenses = AppState.expenses.filter(exp => exp.name.toLowerCase().includes('hotel'));
        const hotelTotal = hotelExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('hotelBills').textContent = hotelTotal > 0 
            ? `${CURRENCY_SYMBOLS[AppState.baseCurrency]}${(hotelTotal * AppState.exchangeRate).toFixed(2)}` 
            : '-';
    }
};

// ============================================
// CHART MANAGER
// ============================================
const ChartManager = {
    update() {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        const totalExpenses = ExpenseController.calculateTotal();
        const remainingBalance = AppState.salary - totalExpenses;
        
        if (chart) chart.destroy();
        
        chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Total Expenses', 'Remaining Balance'],
                datasets: [{
                    data: [totalExpenses, remainingBalance > 0 ? remainingBalance : 0],
                    backgroundColor: ['rgba(255, 107, 107, 0.8)', 'rgba(91, 79, 233, 0.8)'],
                    borderColor: ['rgba(255, 107, 107, 1)', 'rgba(91, 79, 233, 1)'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: { animateScale: true, animateRotate: true, duration: 1000, easing: 'easeOutQuart' },
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 20, font: { size: 14, weight: '600' } } },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed || 0;
                                return `${context.label}: ${CURRENCY_SYMBOLS[AppState.baseCurrency]}${(value * AppState.exchangeRate).toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }
};

// ============================================
// CURRENCY CONVERTER
// ============================================
const CurrencyConverter = {
    async handleChange() {
        const newCurrency = DOM.currencySelect.value;
        if (newCurrency === AppState.baseCurrency) return;
        
        try {
            const response = await fetch(`https://api.frankfurter.app/latest?from=${AppState.baseCurrency}&to=${newCurrency}`);
            const data = await response.json();
            AppState.exchangeRate = data.rates[newCurrency];
            AppState.baseCurrency = newCurrency;
            UIUpdater.updateAll();
        } catch (error) {
            UIHelper.showError('Failed to fetch exchange rates');
        }
    }
};

// ============================================
// PDF EXPORTER
// ============================================
const PDFExporter = {
    generate() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.setTextColor(91, 79, 233);
        doc.text('Cash-Flow Report', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 28, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Summary', 20, 45);
        
        doc.setFontSize(11);
        const totalExpenses = ExpenseController.calculateTotal();
        const remainingBalance = AppState.salary - totalExpenses;
        
        doc.text(`Total Salary: ${CURRENCY_SYMBOLS[AppState.baseCurrency]}${(AppState.salary * AppState.exchangeRate).toFixed(2)}`, 20, 55);
        doc.text(`Total Expenses: ${CURRENCY_SYMBOLS[AppState.baseCurrency]}${(totalExpenses * AppState.exchangeRate).toFixed(2)}`, 20, 63);
        doc.text(`Remaining Balance: ${CURRENCY_SYMBOLS[AppState.baseCurrency]}${(remainingBalance * AppState.exchangeRate).toFixed(2)}`, 20, 71);
        
        if (AppState.expenses.length > 0) {
            doc.setFontSize(14);
            doc.text('Expense Breakdown', 20, 85);
            doc.setFontSize(10);
            let yPosition = 95;
            
            AppState.expenses.forEach((expense, index) => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(`${index + 1}. ${expense.name} (${expense.category})`, 25, yPosition);
                doc.text(`${CURRENCY_SYMBOLS[AppState.baseCurrency]}${(expense.amount * AppState.exchangeRate).toFixed(2)}`, 170, yPosition);
                yPosition += 8;
            });
        }
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by Cash-Flow Tracker', 105, 285, { align: 'center' });
        doc.save(`cash-flow-report-${new Date().toISOString().split('T')[0]}.pdf`);
        UIHelper.showToast('PDF downloaded successfully!');
    }
};

// ============================================
// DATA MANAGER
// ============================================
const DataManager = {
    exportJSON() {
        const data = {
            salary: AppState.salary,
            expenses: AppState.expenses,
            baseCurrency: AppState.baseCurrency,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cash-flow-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UIHelper.showToast('Data exported successfully!');
    },
    
    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.salary !== undefined) AppState.salary = data.salary;
                if (data.expenses) AppState.expenses = data.expenses;
                if (data.baseCurrency) AppState.baseCurrency = data.baseCurrency;
                
                DOM.salaryInput.value = AppState.salary;
                DOM.currencySelect.value = AppState.baseCurrency;
                
                StorageManager.save();
                UIUpdater.updateAll();
                UIHelper.showToast('Data imported successfully!');
            } catch (error) {
                UIHelper.showError('Invalid JSON file');
            }
        };
        reader.readAsText(file);
        DOM.fileInput.value = '';
    },
    
    resetAll() {
        AppState.salary = 0;
        AppState.expenses = [];
        DOM.salaryInput.value = '';
        localStorage.clear();
        UIUpdater.updateAll();
        DOM.confirmModal.classList.remove('show');
        UIHelper.showToast('All data reset successfully!');
    }
};

// ============================================
// STORAGE MANAGER
// ============================================
const StorageManager = {
    save() {
        localStorage.setItem('salary', AppState.salary.toString());
        localStorage.setItem('expenses', JSON.stringify(AppState.expenses));
        localStorage.setItem('baseCurrency', AppState.baseCurrency);
    },
    
    load() {
        const savedSalary = localStorage.getItem('salary');
        const savedExpenses = localStorage.getItem('expenses');
        const savedCurrency = localStorage.getItem('baseCurrency');
        
        if (savedSalary) {
            AppState.salary = parseFloat(savedSalary);
            DOM.salaryInput.value = AppState.salary;
        }
        if (savedExpenses) AppState.expenses = JSON.parse(savedExpenses);
        if (savedCurrency) {
            AppState.baseCurrency = savedCurrency;
            DOM.currencySelect.value = savedCurrency;
        }
    }
};

// ============================================
// THEME MANAGER
// ============================================
const ThemeManager = {
    toggle() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const icon = DOM.themeToggle.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    },
    
    load() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const icon = DOM.themeToggle.querySelector('i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
};

// ============================================
// UI HELPER
// ============================================
const UIHelper = {
    showToast(message) {
        DOM.toastMessage.textContent = message;
        DOM.toast.classList.add('show');
        setTimeout(() => DOM.toast.classList.remove('show'), TOAST_DURATION);
    },
    
    showError(message) {
        DOM.errorMessage.textContent = message;
    },
    
    clearError() {
        DOM.errorMessage.textContent = '';
    }
};

// ============================================
// EVENT MANAGER
// ============================================
const EventManager = {
    attachAll() {
        DOM.setSalaryBtn.addEventListener('click', () => ExpenseController.handleSalaryInput());
        DOM.addExpenseBtn.addEventListener('click', () => ExpenseController.addExpense());
        DOM.expenseAmount.addEventListener('keypress', (e) => { if (e.key === 'Enter') ExpenseController.addExpense(); });
        DOM.searchExpense.addEventListener('input', () => ExpenseController.filterExpenses());
        DOM.filterCategory.addEventListener('change', () => ExpenseController.filterExpenses());
        DOM.downloadPdfBtn.addEventListener('click', () => PDFExporter.generate());
        DOM.exportJsonBtn.addEventListener('click', () => DataManager.exportJSON());
        DOM.importJsonBtn.addEventListener('click', () => DOM.fileInput.click());
        DOM.fileInput.addEventListener('change', (e) => DataManager.importJSON(e));
        DOM.currencySelect.addEventListener('change', () => CurrencyConverter.handleChange());
        DOM.themeToggle.addEventListener('click', () => ThemeManager.toggle());
        DOM.resetMonthBtn.addEventListener('click', () => DOM.confirmModal.classList.add('show'));
        DOM.cancelReset.addEventListener('click', () => DOM.confirmModal.classList.remove('show'));
        DOM.confirmReset.addEventListener('click', () => DataManager.resetAll());
    }
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
    StorageManager.load();
    ThemeManager.load();
    UIUpdater.updateAll();
    EventManager.attachAll();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
