        // State
        let currentWeight = "0"; // Represents the keypad input
        let totalWeightAccumulated = 0;
        let totalPriceAccumulated = 0;
        let selectedGradeId = "rubber";

        const grades = [
            { id: 'rubber', name: 'ລາຄາຢາງ', price: 30.00 }
        ];

        let transactions = [];
        let currentCustomerName = "";
        let currentInvoiceNumber = "";
        let isFromSaveFlow = false; // Track if modal opened from save button

        // Generate Invoice Number
        function generateInvoiceNumber() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateStr = `${year}${month}${day}`;

            // Get counter from localStorage
            let counter = parseInt(localStorage.getItem('invoice_counter') || '0');
            counter++;
            localStorage.setItem('invoice_counter', counter.toString());

            // Format: INV-20260207-001
            const invoiceNum = `B${dateStr}-${String(counter).padStart(3, '0')}`;
            return invoiceNum;
        }

        // Init
        function init() {
            // Load saved rates
            const savedGrades = localStorage.getItem('rubber_rates');
            if (savedGrades) {
                try {
                    const parsed = JSON.parse(savedGrades);
                    // Update current grades array with saved prices
                    parsed.forEach(saved => {
                        const grade = grades.find(g => g.id === saved.id);
                        if (grade) grade.price = saved.price;
                    });
                } catch (e) { console.error("Error loading rates", e); }
            }

            // Load saved transactions (optional but helpful for persistence)
            const savedTx = localStorage.getItem('rubber_transactions');
            if (savedTx) {
                try {
                    transactions = JSON.parse(savedTx);
                    // Recalculate totals from loaded transactions
                    totalWeightAccumulated = transactions.reduce((sum, tx) => sum + tx.weight, 0);
                    totalPriceAccumulated = transactions.reduce((sum, tx) => sum + tx.price, 0);
                } catch (e) { console.error("Error loading history", e); }
            }

            renderGrades();
            renderHistory();
            updateDisplay();

            // Add click listener to ADD button
            const addBtn = document.getElementById('addBtn');
            if (addBtn) addBtn.onclick = addToSession;
        }

        // Logic
        function inputDigit(digit) {
            if (currentWeight === "0" && digit !== ".") {
                currentWeight = digit;
            } else {
                if (digit === "." && currentWeight.includes(".")) return;
                if (currentWeight.length > 7) return; // Max length
                currentWeight += digit;
            }
            updateDisplay();
        }

        function inputDelete() {
            if (currentWeight.length === 1) {
                currentWeight = "0";
            } else {
                currentWeight = currentWeight.slice(0, -1);
            }
            updateDisplay();
        }

        function clearInput() {
            currentWeight = "0";
            updateDisplay();
        }

        function addToSession() {
            const weight = parseFloat(currentWeight);
            if (weight <= 0) return;

            const grade = grades.find(g => g.id === selectedGradeId);
            const price = weight * grade.price;

            // Add to totals
            totalWeightAccumulated += weight;
            totalPriceAccumulated += price;

            // Add to history
            const now = new Date();
            const timeString = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0') + " ໂມງ";

            const newTx = {
                id: Date.now(),
                weight: weight,
                price: price,
                time: timeString
            };

            transactions.unshift(newTx);
            localStorage.setItem('rubber_transactions', JSON.stringify(transactions));
            renderHistory();

            // Allow next input
            currentWeight = "0";
            updateDisplay();
        }

        function selectGrade(id) {
            selectedGradeId = id;
            renderGrades();
            // Payout calculation for individual item is handled in addToSession/updatePayout logic implicitly
        }

        function updateDisplay() {
            // Update Input Box
            const inputDisplay = document.getElementById('currentInputDisplay');
            if (inputDisplay) inputDisplay.innerText = currentWeight === "0" ? "0.00" : currentWeight;

            // Update Totals (Center Panel)
            const totalWeightEl = document.getElementById('totalWeightDisplay');
            if (totalWeightEl) totalWeightEl.innerText = totalWeightAccumulated.toFixed(2);

            const totalPriceEl = document.getElementById('totalPriceDisplay');
            if (totalPriceEl) totalPriceEl.innerText = totalPriceAccumulated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Update Sacks (Automatically from transactions length)
            const totalSacksEl = document.getElementById('totalSacksDisplay');
            if (totalSacksEl) totalSacksEl.innerText = transactions.length;

            // Update Payout (Right Panel Footer)
            const payoutEl = document.getElementById('payoutAmount');
            if (payoutEl) {
                payoutEl.innerText = totalPriceAccumulated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₭";
            }
        }

        // Deprecated but kept for safety if referenced
        function updatePayout() {
            // Logic moved to updateDisplay mostly
        }

        function saveTransaction() {
            if (totalWeightAccumulated <= 0) {
                alert("ກະລຸນາເພີ່ມລາຍການກ່ອນບັນທຶກ");
                return;
            }

            // Check if customer name is already entered
            const nameInput = document.getElementById('customerNameInput');
            const existingName = nameInput.value.trim();

            if (existingName) {
                // Name already entered, go directly to print preview
                currentCustomerName = existingName;
                currentInvoiceNumber = generateInvoiceNumber();
                renderReceipt();
                document.getElementById('receiptModal').style.display = 'flex';
            } else {
                // No name yet, show name modal
                isFromSaveFlow = true; // Mark that we're coming from save
                document.getElementById('customerModal').style.display = 'flex';
                nameInput.focus();
            }
        }

        function openNameModal() {
            isFromSaveFlow = false; // Mark that we're NOT from save (manual name entry)
            document.getElementById('customerModal').style.display = 'flex';
            document.getElementById('customerNameInput').focus();
        }

        function confirmCustomer() {
            const nameInput = document.getElementById('customerNameInput');
            const name = nameInput.value.trim();

            if (!name) {
                alert("ກະລຸນາກະລອກຊື່ລູກຄ້າກ່ອນບັນທຶກ!");
                nameInput.focus();
                return;
            }

            currentCustomerName = name;
            closeModal('customerModal');

            // If opened from save flow, go directly to print preview
            if (isFromSaveFlow) {
                currentInvoiceNumber = generateInvoiceNumber();
                renderReceipt();
                document.getElementById('receiptModal').style.display = 'flex';
                isFromSaveFlow = false; // Reset flag
            }
            // Otherwise, just close modal and let user continue adding weights
        }

        function closeModal(id) {
            document.getElementById(id).style.display = 'none';
        }

        function renderReceipt() {
            const content = document.getElementById('receiptContent');
            const now = new Date();
            const dateStr = now.toLocaleDateString('lo-LA', { year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = now.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' });

            content.innerHTML = `
            <div class="receipt-paper">
                <div class="receipt-header">
                    <h2>RubberTrade</h2>
                    <p>ໃບບິນຊັ່ງນ້ຳໜັກຢາງ</p>
                </div>

                <div class="receipt-meta">
                    <div class="datetime">
                        <span>${dateStr}</span>
                        <span>${timeStr}</span>
                    </div>
                </div>
                <div class="receipt-meta" style="margin-top: 16px; border-top: 1px dashed #eee; padding-top: 12px;">
                    <div class="row" style="margin-bottom: 8px;">
                        <span>ເລກທີ່:</span> <strong>${currentInvoiceNumber}</strong>
                    </div>
                    <div class="row">
                        <span>ລູກຄ້າ:</span> <strong>${currentCustomerName}</strong>
                    </div>
                    <div class="row">
                        <span>ຈຳນວນເປົາ:</span> <strong>${transactions.length}</strong>
                    </div>
                    <div class="row">
                        <span>ຜູ້ຮັບຊື้:</span> <span>ທ້າວ ລາມົວ</span>
                    </div>
                </div>

                <table class="receipt-table">
                    <thead>
                        <tr>
                            <th class="col-no">ລໍາດັບ</th>
                            <th class="col-weight">ນ້ຳໜັກ (kg)</th>
                            <th class="col-price">ລາຄາ (₭)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map((tx, idx) => `
                        <tr>
                            <td class="col-no">${transactions.length - idx}</td>
                            <td class="col-weight">${tx.weight.toFixed(2)}</td>
                            <td class="col-price">
                                ${tx.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                        `).reverse().join('')}
                    </tbody>
                </table>

                <div class="receipt-total">
                    <div class="total-row">
                        <span>ນ້ຳໜັກລວມ</span>
                        <span>${totalWeightAccumulated.toFixed(2)} kg</span>
                    </div>

                    <div class="total-row grand-total">
                        <span>ລາຄາລວມ</span>
                        <span>
                            ${totalPriceAccumulated.toLocaleString(undefined, { minimumFractionDigits: 2 })} ₭
                        </span>
                    </div>
                </div>

                

                <div class="print-only-info">
                    <p>ຂອບໃຈທີ່ໃຊ້ບໍລິການ</p>
                    <p>*** ບິນນີ້ພິມຈາກລະບົບດິຈິຕອນ ***</p>
                </div>
            </div>
            `;
        }

        function printReceipt() {
            window.print();

            // After print dialog closes (whether printed or canceled), reset everything
            // Also save to Google Sheets
            saveToGoogleSheets();
            resetTransaction();
        }

        async function saveToGoogleSheets() {
            const scriptUrl = 'https://script.google.com/macros/s/AKfycbzAgSmo1Zpjuk0t1SVnjrCmYQDSM9BfJqPTtfbe7XaauHQT6L_nbjpk5p61hcJDlRsa/exec';

            // Get current date/time
            const now = new Date();
            const dateStr = now.toLocaleDateString('lo-LA');
            const timeStr = now.toLocaleTimeString('lo-LA');

            const data = {
                invoice: currentInvoiceNumber,
                customer: currentCustomerName,
                sacks: transactions.length,
                totalWeight: totalWeightAccumulated,
                totalAmount: totalPriceAccumulated,
                date: dateStr,
                time: timeStr
            };

            try {
                // Using method: 'POST' with mode: 'no-cors' for Google Apps Script
                await fetch(scriptUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                console.log('Data sent to Google Sheets successfully');
            } catch (error) {
                console.error('Error saving to Google Sheets:', error);
            }
        }

        function resetTransaction() {
            // Reset all session data
            totalWeightAccumulated = 0;
            totalPriceAccumulated = 0;
            transactions = [];
            currentWeight = "0";
            currentCustomerName = "";
            document.getElementById('customerNameInput').value = "";
            localStorage.removeItem('rubber_transactions');

            // Close receipt modal and update UI
            closeModal('receiptModal');
            renderHistory();
            updateDisplay();
        }

        // Renders
        function renderGrades() {
            // Grade selection removed as requested
            const dList = document.getElementById('desktopPriceList');
            if (dList) dList.innerHTML = '';

            const mList = document.getElementById('mobileGradeSelector');
            if (mList) mList.innerHTML = '';
        }

        function deleteTransaction(id) {
            const index = transactions.findIndex(t => t.id === id);
            if (index !== -1) {
                const tx = transactions[index];
                totalWeightAccumulated -= tx.weight;
                totalPriceAccumulated -= tx.price;
                transactions.splice(index, 1);
                localStorage.setItem('rubber_transactions', JSON.stringify(transactions));
                renderHistory();
                updateDisplay();
            }
        }

        function renderHistory() {
            // Mobile List
            const mobileList = document.getElementById('mobileHistoryList');
            if (mobileList) {
                if (transactions.length === 0) {
                    mobileList.innerHTML = '<div style="text-align: center; color: #999; margin-top: 40px;">No Recent Transactions</div>';
                } else {
                    mobileList.innerHTML = `
                        <div style="margin-bottom:10px; font-weight:600; color:#666; font-size:0.9rem;">ລາຍການຫຼ້າສຸດ</div>
                        ` + transactions.map(tx => `
                        <div class="history-card" style="position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                            <div style="flex: 1;">
                                <div class="h-weight">${tx.weight.toFixed(2)} kg</div>
                                <div class="h-time">${tx.time}</div>
                            </div>
                            <div class="h-price" style="flex: 1; text-align: center;">${tx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</div>
                            <button onclick="deleteTransaction(${tx.id})" style="background: #ffebee; color: #ef5350; border: none; width: 32px; height: 32px; border-radius: 8px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;">&times;</button>
                        </div>
                    `).join('');
                }
            }

            // Desktop List (Right Panel)
            const desktopList = document.getElementById('desktopPriceList');
            if (desktopList) {
                if (transactions.length === 0) {
                    desktopList.innerHTML = '<div style="text-align: center; color: #999; margin-top: 40px;">No Recent Transactions</div>';
                } else {
                    desktopList.innerHTML = transactions.map(tx => `
                        <div class="price-item" style="cursor: default; background: white; border: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                            <div style="flex: 1;">
                                <div style="font-weight: 700; font-size: 1.1rem;">${tx.weight.toFixed(2)} kg</div>
                                <div style="font-size: 0.85rem; color: #888;">${tx.time}</div>
                            </div>
                            
                            <div style="text-align: center; flex: 1;">
                                <div style="font-weight: 600; color: #00C853; font-size: 1.1rem;">${tx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</div>
                                <div style="font-size: 0.8rem; color: #aaa;">&nbsp;</div>
                            </div>

                            <button onclick="deleteTransaction(${tx.id})" 
                                style="background: #ffebee; color: #ef5350; border: none; width: 36px; height: 36px; border-radius: 8px; font-size: 1.2rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                &times;
                            </button>
                        </div>
                    `).join('');
                }
            }
        }

        // Modal Functions
        function openPriceModal() {
            const modal = document.getElementById('priceModal');
            const inputList = document.getElementById('modalInputList');

            // Populate inputs
            inputList.innerHTML = grades.map(grade => `
                <div class="price-input-group">
                    <label>${grade.name}</label>
                    <div class="price-input-wrapper">
                        <input type="number" step="0.01" id="price-input-${grade.id}" value="${grade.price}">
                        <span>₭</span>
                    </div>
                </div>
            `).join('');

            modal.style.display = 'flex';
        }

        function closePriceModal() {
            document.getElementById('priceModal').style.display = 'none';
        }

        function savePrices() {
            grades.forEach(grade => {
                const input = document.getElementById(`price-input-${grade.id}`);
                if (input) {
                    grade.price = parseFloat(input.value);
                }
            });

            // Persist to localStorage
            localStorage.setItem('rubber_rates', JSON.stringify(grades));

            // Re-calculate session price if there's an ongoing input (mostly for UI consistency)
            updateDisplay();
            closePriceModal();
            alert("ບັນທຶກລາຄາໃໝ່ຮຽບຮ້ອຍແລ້ວ");
        }

        // Run
        init();

        // Mobile Specific Layout Tweaks via JS if CSS isn't enough
        const styleSheet = document.createElement("style");
        styleSheet.innerText = `
            @media (max-width: 768px) {
                .input-row { display: flex !important; }
                .mobile-bottom-bar { display: block !important; }
                .desktop-only { display: none !important; }
            }
        `;
        document.head.appendChild(styleSheet);
