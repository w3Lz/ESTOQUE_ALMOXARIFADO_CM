const graph = {
    // Mantive o nome do objeto 'graph' para não quebrar o app.js
    // Mas agora ele usa a API do Google Sheets

    readTable: async (tableName) => {
        try {
            // tableName no Sheets é o nome da aba (Ex: PRODUTOS)
            // Vamos pegar todas as colunas (A:Z)
            const range = `${tableName}!A:Z`;
            
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: Config.spreadsheetId,
                range: range,
            });

            const rows = response.result.values;
            
            if (!rows || rows.length === 0) return [];

            // Convert array of arrays to array of objects
            const headerRow = rows[0];
            const dataRows = rows.slice(1);
            
            return dataRows.map(row => {
                let obj = {};
                headerRow.forEach((head, index) => {
                    // Mapeia valor ou vazio se não existir
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
        // valuesArray é [[val1, val2...]]
        try {
            const range = `${sheetName}!A:A`; // Append no final da planilha
            
            const body = {
                values: valuesArray
            };

            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: Config.spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED', // Interpreta datas e números
                resource: body,
            });

            return true;

        } catch (error) {
            console.error("Sheets Write Error:", error);
            ui.showToast("Erro ao salvar: " + (error.result?.error?.message || error.message), 'error');
            throw error;
        }
    }
};
