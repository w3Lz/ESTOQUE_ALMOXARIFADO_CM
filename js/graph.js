const graph = {
    readTable: async (tableName) => {
        try {
            const range = `${tableName}!A:Z`;
            
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: Config.spreadsheetId,
                range: range,
            });

            const rows = response.result.values;
            
            if (!rows || rows.length === 0) return [];

            const headerRow = rows[0];
            const dataRows = rows.slice(1);
            
            return dataRows.map(row => {
                let obj = {};
                headerRow.forEach((head, index) => {
                    obj[head] = row[index] || ""; 
                });
                return obj;
            });

        } catch (error) {
            console.error("Sheets Read Error:", error);
            ui.showToast("Erro ao ler dados: " + (error.result?.error?.message || error.message), 'error');
            return [];
        }
    },

    addRow: async (sheetName, valuesArray) => {
        if (!auth.isAuthenticated()) {
            ui.showToast("Você precisa fazer Login para salvar dados!", "warning");
            auth.signIn();
            throw new Error("Usuário não autenticado");
        }

        try {
            const range = `${sheetName}!A:A`;
            
            const body = {
                values: valuesArray
            };

            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: Config.spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: body,
            });

            return true;

        } catch (error) {
            console.error("Sheets Write Error:", error);
            ui.showToast("Erro ao salvar: " + (error.result?.error?.message || error.message), 'error');
            throw error;
        }
    },

    updateRow: async (sheetName, rowNumber, valuesArray) => {
        if (!auth.isAuthenticated()) {
            ui.showToast("Você precisa fazer Login para salvar dados!", "warning");
            auth.signIn();
            throw new Error("Usuário não autenticado");
        }

        try {
            const range = `${sheetName}!A${rowNumber}`;
            
            const body = {
                values: [valuesArray]
            };

            const response = await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: Config.spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: body,
            });

            return true;

        } catch (error) {
            console.error("Sheets Update Error:", error);
            ui.showToast("Erro ao atualizar: " + (error.result?.error?.message || error.message), 'error');
            throw error;
        }
    }
};
