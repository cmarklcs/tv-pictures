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
    if (f.isTrashed()) continue;
    var item = { id: f.getId(), name: f.getName(), updated: f.getLastUpdated().getTime() };
    var type = f.getMimeType();
    if (type.indexOf('image/') === 0) {
      pictures.push(item);
    } else if (type.indexOf('video/') === 0) {
      // TVs aren't signed in to Google, so a video has to be viewable by link to stream.
      item.video = 'https://drive.google.com/uc?export=download&confirm=t&id=' + item.id;
      if (!shareByLink(f, item.updated)) item.notShared = true;
      pictures.push(item);
    } else if (type === MimeType.GOOGLE_DOCS || type === MimeType.PLAIN_TEXT) {
      // A Google Doc (or text file) with a YouTube link in it shows as a video.
      var video = youTubeId(f, item.updated);
      if (video) {
        item.youtube = video;
        pictures.push(item);
      }
    }
  }
  pictures.sort(function (a, b) {
    var x = a.name.toLowerCase(), y = b.name.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });
  return { folder: folder.getName(), pictures: pictures };
}

/** Makes a video in the TV folder viewable by anyone with its link; remembered until it changes. */
function shareByLink(file, updated) {
  var cache = CacheService.getScriptCache();
  var key = 'shared:' + file.getId() + ':' + updated;
  if (cache.get(key) === 'yes') return true;
  var ok = false;
  try {
    var access = file.getSharingAccess();
    ok = access === DriveApp.Access.ANYONE_WITH_LINK || access === DriveApp.Access.ANYONE;
    if (!ok) {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      ok = true;
    }
  } catch (err) {
    // Not allowed, e.g. the school blocks link sharing or the uploader locked the file.
  }
  if (ok) cache.put(key, 'yes', 21600);
  return ok;
}

/** Finds the first YouTube link in a Doc or text file; remembered until the file changes. */
function youTubeId(file, updated) {
  var cache = CacheService.getScriptCache();
  var key = 'yt:' + file.getId() + ':' + updated;
  var known = cache.get(key);
  if (known !== null) return known;
  var text = '';
  try {
    if (file.getMimeType() === MimeType.PLAIN_TEXT) {
      text = file.getBlob().getDataAsString();
    } else {
      text = UrlFetchApp.fetch(
        'https://www.googleapis.com/drive/v3/files/' + file.getId() + '/export?mimeType=text/plain',
        { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getContentText();
    }
  } catch (err) {
    return '';
  }
  var match = text.match(
    /(?:youtube\.com\/(?:watch\?(?:[^\s#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  var id = match ? match[1] : '';
  cache.put(key, id, 21600);
  return id;
}

/** Returns one picture as a data URL, resized by Google so phone photos (even HEIC) load fast. */
function getImage(id, size) {
  var file = DriveApp.getFileById(id);
  // The web app is public, so only ever hand out pictures that are in the TV folder.
  var isVideo = file.getMimeType().indexOf('video/') === 0;
  if (!isInFolder(file) || (file.getMimeType().indexOf('image/') !== 0 && !isVideo)) {
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
  if (!blob && isVideo) throw new Error('Google is still making this video\'s preview picture.');
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
