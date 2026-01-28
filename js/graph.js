const graph = {
    fileId: null,

    getHeaders: async () => {
        const token = await auth.getToken();
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },

    getFileId: async () => {
        if (graph.fileId) return graph.fileId;

        const headers = await graph.getHeaders();
        const fileName = Config.excelFileName;
        
        // Search for file in root
        const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root/search(q='${fileName}')`, { headers });
        const data = await response.json();
        
        if (data.value && data.value.length > 0) {
            graph.fileId = data.value[0].id;
            return graph.fileId;
        } else {
            throw new Error(`Arquivo '${fileName}' não encontrado no OneDrive.`);
        }
    },

    readTable: async (tableName) => {
        try {
            const id = await graph.getFileId();
            const headers = await graph.getHeaders();
            
            // Try to read as Table first (Preferred)
            // Assuming Table Name matches Sheet Name or User defined it
            // Using usedRange of the Sheet is safer if user didn't define "Tables" formally
            const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${id}/workbook/worksheets/${tableName}/usedRange`, { headers });
            
            if (!response.ok) {
                 // If sheet doesn't exist, maybe it's case sensitive or named differently?
                 throw new Error(`Erro ao ler aba '${tableName}'. Verifique se ela existe.`);
            }

            const data = await response.json();
            const rows = data.values; // [][]
            
            if (!rows || rows.length === 0) return [];

            // Convert array of arrays to array of objects
            const headerRow = rows[0];
            const dataRows = rows.slice(1);
            
            return dataRows.map(row => {
                let obj = {};
                headerRow.forEach((head, index) => {
                    // Normalize keys (remove spaces, lowercase)
                    // But keep original logic if needed. PRD uses specific column names.
                    obj[head] = row[index];
                });
                return obj;
            });

        } catch (error) {
            console.error("Graph Read Error:", error);
            ui.showToast(error.message, 'error');
            return [];
        }
    },

    addRow: async (sheetName, valuesArray) => {
        // ValuesArray should be an array of arrays [[val1, val2...]]
        // We append to the sheet
        try {
            const id = await graph.getFileId();
            const headers = await graph.getHeaders();
            
            // Get used range to know where to append
            // A better way in Excel API to append to a sheet (without Table) is tricky.
            // If we use Tables, we can POST /tables/{name}/rows
            // Let's try to assume there is a Table named same as Sheet.
            // If that fails, we might need a fallback.
            // For this MVP, let's STRONGLY SUGGEST using Tables in the documentation.
            // BUT, to be robust, let's use the Sheet Append pattern if possible? 
            // Graph API doesn't have "Append to Sheet" easily without Tables.
            // We will fetch usedRange, get row count, and write to next row.
            
            const usedRangeResp = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${id}/workbook/worksheets/${sheetName}/usedRange`, { headers });
            const usedRange = await usedRangeResp.json();
            
            const lastRowIndex = usedRange.rowIndex + usedRange.rowCount; // 0-based index of next empty row
            // rowIndex is 0-based. rowCount is number of rows.
            // e.g. Start at 0, 1 row. Next is 1.
            
            // Address: A{lastRowIndex + 1}
            // Excel rows are 1-based. 
            // If rowIndex=0, rowCount=1 (Header), next is row 2.
            // API expects "A2".
            const nextRowNumber = lastRowIndex + 1;
            
            const rangeAddress = `A${nextRowNumber}`; 
            
            // We need to know how many columns?
            // Assuming valuesArray matches the number of columns in header.
            // We can just write the row.
            
            const body = {
                values: valuesArray
            };

            const updateResp = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${id}/workbook/worksheets/${sheetName}/range(address='${rangeAddress}')`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!updateResp.ok) {
                const err = await updateResp.json();
                throw new Error(err.error.message);
            }
            
            return true;

        } catch (error) {
            console.error("Graph Write Error:", error);
            ui.showToast("Erro ao salvar: " + error.message, 'error');
            throw error;
        }
    }
};
