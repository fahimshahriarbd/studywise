/**
 * =========================================================================
 * StudyWise - Google Apps Script (Backend for Google Sheets Database)
 * =========================================================================
 * 
 * Instructions:
 * 1. Open your Google Sheet: https://sheets.google.com
 * 2. In the menu, go to: Extensions > Apps Script (এক্সটেনশন > অ্যাপস স্ক্রিপ্ট)
 * 3. Delete any code in Code.gs and PASTE all the code below.
 * 4. Click the Save icon (বাটন: Save).
 * 5. Click "Deploy" (ডিপ্লয়) > "New deployment" (নতুন ডিপ্লয়মেন্ট)
 * 6. Select type: "Web app" (ওয়েব অ্যাপ)
 * 7. Description: StudyWise API
 * 8. Execute as: "Me" (আপনার জিমেইল)
 * 9. Who has access: "Anyone" (যে কেউ - অতি জরুরি!)
 * 10. Click "Deploy", approve permissions, and COPY the Web App URL (exec URL).
 * 11. Put that URL in your .env or app setting VITE_GOOGLE_APPS_SCRIPT_URL.
 * =========================================================================
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'StudyWise Apps Script is running online!'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var payload = JSON.parse(raw);
    var action = payload.action;
    var tableName = payload.table;
    var row = payload.row;
    var id = payload.id != null ? String(payload.id).trim() : null;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(ss, tableName);

    if (action === 'read') {
      var values = sheet.getDataRange().getValues();
      return jsonResponse({
        status: 'success',
        data: values
      });
    }

    if (action === 'insert') {
      if (Array.isArray(row)) {
        sheet.appendRow(row);
        return jsonResponse({ status: 'success' });
      }
      return jsonResponse({ status: 'error', message: 'Row must be an array' });
    }

    if (action === 'update') {
      if (!id || !Array.isArray(row)) {
        return jsonResponse({ status: 'error', message: 'Missing ID or row array' });
      }
      var data = sheet.getDataRange().getValues();
      var foundRow = -1;

      // Find by ID in column 1 (index 0)
      for (var i = 1; i < data.length; i++) {
        var cellId = data[i][0] != null ? String(data[i][0]).trim() : '';
        if (cellId === id) {
          foundRow = i + 1; // 1-indexed sheet row
          break;
        }
      }

      if (foundRow > 0) {
        var range = sheet.getRange(foundRow, 1, 1, row.length);
        range.setValues([row]);
        return jsonResponse({ status: 'success', updatedRow: foundRow });
      } else {
        // If not found, append as new row
        sheet.appendRow(row);
        return jsonResponse({ status: 'success', note: 'Appended as new row' });
      }
    }

    if (action === 'delete') {
      if (!id) {
        return jsonResponse({ status: 'error', message: 'Missing ID to delete' });
      }
      var data = sheet.getDataRange().getValues();
      var deleted = false;
      // Search from bottom up to avoid index shifts if multiple
      for (var i = data.length - 1; i >= 1; i--) {
        var cellId = data[i][0] != null ? String(data[i][0]).trim() : '';
        if (cellId === id) {
          sheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }
      return jsonResponse({ status: 'success', deleted: deleted });
    }

    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });

  } catch (err) {
    return jsonResponse({
      status: 'error',
      message: err.toString()
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Auto creates sheet with default headers if tab does not exist
function getOrCreateSheet(ss, tableName) {
  var sheet = ss.getSheetByName(tableName);
  if (sheet) return sheet;

  sheet = ss.insertSheet(tableName);

  var headers = {
    'Admin': ['Username', 'PIN', 'Updated At'],
    'Students': [
      'Student ID', 'Full Name', 'Class / Grade', 'Subjects', 'PIN',
      'Photo URL', 'Created At', 'Phone', 'Email', 'Address', 'Gender',
      'Institution', 'Blood Group'
    ],
    'StudyDays': ['Day ID', 'Student ID', 'Day Label', 'Date', 'Created At'],
    'Lessons': ['Lesson ID', 'Study Day ID', 'Subject', 'Topics & Notes', 'PDF Resource', 'Quiz Enabled', 'Created At'],
    'Questions': ['Question ID', 'Lesson ID', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer', 'Explanation', 'Created At'],
    'QuizResults': ['Result ID', 'Student ID', 'Lesson ID', 'Score', 'Total Questions', 'Percentage', 'Submitted At', 'Review JSON']
  };

  if (headers[tableName]) {
    sheet.appendRow(headers[tableName]);
  }

  // Pre-seed default Admin if Admin sheet created
  if (tableName === 'Admin') {
    sheet.appendRow(['admin', '5678', new Date().toISOString()]);
  }

  return sheet;
}
