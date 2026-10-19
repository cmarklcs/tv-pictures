# Connecting the TV page to a Google Drive folder

Do this once, signed in to the Google account that will own the pictures folder.
It takes about 5 minutes.

## Part 1: Make the shared folder

1. Go to [drive.google.com](https://drive.google.com) and click **New → New folder**. Name it **TV Pictures**.
2. Open the folder. Its web address looks like
   `https://drive.google.com/drive/folders/1AbC...xyz`.
   Copy the part after `/folders/` and keep it handy. That's the **folder ID**.
3. Click the folder name → **Share**, and add the staff who should add pictures as **Editor**
   (a staff group email works too). The folder itself doesn't need to be public.

## Part 2: Add the small Google script

1. Go to [script.google.com](https://script.google.com) and click **New project**.
   Click **Untitled project** at the top and rename it **TV Pictures**.
2. Delete the code that's there, then copy everything from
   [Code.gs](https://raw.githubusercontent.com/cmarklcs/tv-pictures/main/google-apps-script/Code.gs)
   and paste it in.
3. On the line `var FOLDER_ID = 'PASTE_YOUR_FOLDER_ID_HERE';`, replace
   `PASTE_YOUR_FOLDER_ID_HERE` with your folder ID. Keep the quote marks.
   Press **Cmd+S** (Mac) or **Ctrl+S** (Windows) to save.
4. In the toolbar's function menu, choose **test**, then click **Run**.
   Google asks for permission:
   - Click **Review permissions** and choose your account.
   - If you see "Google hasn't verified this app", click **Advanced → Go to TV Pictures**.
     This is normal for a script you made yourself.
   - Click **Allow**.

   The log at the bottom should say something like `Folder "TV Pictures" has 0 pictures.`
5. Click **Deploy → New deployment**. Click the gear icon next to "Select type" and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy**, then copy the **Web app URL**. It ends in `/exec`.
6. Send that URL to whoever maintains the site so it can be put in `config.js`.
   Or edit `config.js` on GitHub yourself and paste it between the quotes of `PICTURE_SOURCE`.

**If "Anyone" isn't offered** (only "Anyone within your school"), your Google admin blocks
public web apps. TVs aren't signed in to Google, so ask IT to allow it for this script.

## Good to know

- **Privacy:** anyone who has the TV page link can see the pictures in this folder.
  Don't put private photos or student photos in it.
- **Changing the script later:** use **Deploy → Manage deployments → ✏️ Edit → Version: New version**
  so the web address stays the same.
- The permission screen mentions your Drive, but the script only reads pictures inside
  the TV Pictures folder. It refuses any other file.
