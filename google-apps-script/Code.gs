/**
 * TV Pictures: lets the TV page read pictures from one Google Drive folder.
 *
 * Setup (see SETUP.md): paste this into a new project at script.google.com,
 * put your folder's ID below, then Deploy > New deployment > Web app,
 * Execute as: Me, Who has access: Anyone.
 */
var FOLDER_ID = 'PASTE_YOUR_FOLDER_ID_HERE';

function doGet(e) {
  var p = (e && e.parameter) || {};
  var result;
  try {
    result = p.action === 'image' ? getImage(p.id, Number(p.size) || 1920) : listPictures();
  } catch (err) {
    result = { error: String(err && err.message || err) };
  }
  var json = JSON.stringify(result);
  // JSONP, because older TV browsers can't always read cross-site JSON.
  if (p.callback && /^[A-Za-z_$][\w$]*$/.test(p.callback)) {
    return ContentService.createTextOutput(p.callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function listPictures() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var files = folder.getFiles();
  var pictures = [];
  while (files.hasNext()) {
    var f = files.next();
    if (f.isTrashed() || f.getMimeType().indexOf('image/') !== 0) continue;
    pictures.push({ id: f.getId(), name: f.getName(), updated: f.getLastUpdated().getTime() });
  }
  pictures.sort(function (a, b) {
    var x = a.name.toLowerCase(), y = b.name.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });
  return { folder: folder.getName(), pictures: pictures };
}

/** Returns one picture as a data URL, resized by Google so phone photos (even HEIC) load fast. */
function getImage(id, size) {
  var file = DriveApp.getFileById(id);
  // The web app is public, so only ever hand out pictures that are in the TV folder.
  if (!isInFolder(file) || file.getMimeType().indexOf('image/') !== 0) {
    throw new Error('That picture is not in the TV folder.');
  }
  size = Math.max(100, Math.min(size, 2560));
  var blob = null;
  try {
    var auth = { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } };
    var meta = JSON.parse(UrlFetchApp.fetch(
      'https://www.googleapis.com/drive/v3/files/' + id + '?fields=thumbnailLink&supportsAllDrives=true',
      auth).getContentText());
    if (meta.thumbnailLink) {
      var resized = UrlFetchApp.fetch(meta.thumbnailLink.replace(/=s\d+$/, '=s' + size), auth).getBlob();
      if (resized.getContentType().indexOf('image/') === 0) blob = resized;
    }
  } catch (err) {
    // Fall back to the original file below.
  }
  if (!blob) blob = file.getBlob();
  return {
    id: id,
    data: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes())
  };
}

function isInFolder(file) {
  var parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === FOLDER_ID) return true;
  }
  return false;
}

/** Run this once from the editor to check the folder ID and approve access. */
function test() {
  var list = listPictures();
  Logger.log('Folder "' + list.folder + '" has ' + list.pictures.length + ' pictures.');
}
