package com.capycapy.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** Grants the camera access only to this app's temporary capture file. */
public final class PhotoProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }
    private File photo(Uri uri) throws FileNotFoundException {
        if (!"com.capycapy.app.photos".equals(uri.getAuthority()) || !"/photo.jpg".equals(uri.getPath())) throw new FileNotFoundException();
        return new File(getContext().getCacheDir(), "photo.jpg");
    }
    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        return ParcelFileDescriptor.open(photo(uri), ParcelFileDescriptor.parseMode(mode));
    }
    @Override public String getType(Uri uri) { return "image/jpeg"; }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] args, String order) {
        try {
            File file = photo(uri);
            String[] columns = projection == null ? new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE} : projection;
            MatrixCursor cursor = new MatrixCursor(columns);
            Object[] values = new Object[columns.length];
            for (int i=0;i<columns.length;i++) values[i] = OpenableColumns.DISPLAY_NAME.equals(columns[i]) ? "photo.jpg" : OpenableColumns.SIZE.equals(columns[i]) ? file.length() : null;
            cursor.addRow(values); return cursor;
        } catch (FileNotFoundException e) { return null; }
    }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] args) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri uri, String selection, String[] args) { return 0; }
}
