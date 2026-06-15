// Google Sheets Service for Ultatel HR Scorecards

/**
 * Creates a brand new Google Spreadsheet and initializes headers for BDR evaluations.
 * @param accessToken The Google OAuth Access Token
 * @param title The title of the new spreadsheet
 * @returns Object with spreadsheetId and spreadsheetUrl
 */
export async function createSpreadsheet(accessToken: string, title: string = "Ultatel BDR Interview evaluations"): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  try {
    const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: title,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create spreadsheet: ${response.statusText}. Details: ${errText}`);
    }

    const data = await response.json();
    const spreadsheetId = data.spreadsheetId;
    const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Initialize the headers on the newly created sheet
    const range = "Sheet1!A1:M1";
    const headers = [
      [
        "Timestamp/Date",
        "Interviewer Name",
        "Candidate Name",
        "Candidate Site",
        "Email Address",
        "Phone Number",
        "Total Score",
        "Recommendation",
        "Mindset Score (/30)",
        "Honesty Score (/20)",
        "Coachability Score (/15)",
        "Communication Score (/15)",
        "Red Flags / Auto Fails"
      ]
    ];

    await appendRows(accessToken, spreadsheetId, range, headers);

    return { spreadsheetId, spreadsheetUrl };
  } catch (error) {
    console.error("Error in createSpreadsheet:", error);
    throw error;
  }
}

/**
 * Appends a list of rows/values to an existing Google Spreadsheet.
 * @param accessToken The Google OAuth Access Token
 * @param spreadsheetId The target Spreadsheet ID
 * @param range The target Sheet range (e.g. "Sheet1!A1")
 * @param values Array of string/number arrays representing rows
 */
export async function appendRows(accessToken: string, spreadsheetId: string, range: string, values: any[][]): Promise<any> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: values,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to append rows to spreadsheet: ${response.statusText}. Details: ${errText}`);
  }

  return await response.json();
}

/**
 * Formats and appends a single evaluation record as a row in the Google Spreadsheet.
 * @param accessToken The Google OAuth Access Token
 * @param spreadsheetId The target Spreadsheet ID
 * @param record The evaluation record to be appended
 */
export async function appendRecordToSpreadsheet(accessToken: string, spreadsheetId: string, record: any): Promise<any> {
  const formattedDate = new Date(record.date).toLocaleDateString() + " " + new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  // Format any auto-fails/red flags
  let redFlags = "None";
  if (record.scoreInfo?.isMindsetFail) {
    redFlags = "High Quit Risk (Mindset Failed)";
  }
  if (record.scoreInfo?.autoFails && record.scoreInfo.autoFails.length > 0) {
    const fails = record.scoreInfo.autoFails.join("; ");
    redFlags = redFlags === "None" ? fails : `${redFlags}; ${fails}`;
  }

  const row = [
    formattedDate,
    record.interviewerName || "",
    record.candidateName || "",
    record.candidateSite || "",
    record.candidateEmail || "",
    record.candidatePhone || "",
    record.scoreInfo?.total || 0,
    record.scoreInfo?.rec || "",
    record.scoreInfo?.sec3 || 0,
    record.scoreInfo?.sec4 || 0,
    record.scoreInfo?.sec5 || 0,
    record.scoreInfo?.sec6 || 0,
    record.scoreInfo?.sec7 || 0,
    record.scoreInfo?.sec8 || 0,
    redFlags
  ];

  return await appendRows(accessToken, spreadsheetId, "Sheet1!A1", [row]);
}

/**
 * Validates a Spreadsheet ID and returns its title if successful.
 * @param accessToken The Google OAuth Access Token
 * @param spreadsheetId The Spreadsheet ID to validate
 */
export async function validateSpreadsheet(accessToken: string, spreadsheetId: string): Promise<string> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Spreadsheet not found or unauthorized. Details: ${errText}`);
  }

  const data = await response.json();
  return data.properties?.title || "Connected Spreadsheet";
}
