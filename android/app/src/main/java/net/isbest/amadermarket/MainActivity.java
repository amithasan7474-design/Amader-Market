package net.isbest.amadermarket;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    public class ExternalBrowserBridge {
        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null || url.trim().isEmpty()) return;
            runOnUiThread(() -> launchInDefaultBrowser(Uri.parse(url.trim())));
        }
    }

    private void launchInDefaultBrowser(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception ignored) {
        }
    }

    private boolean isInternalAppUrl(String url) {
        if (url == null || url.isEmpty()) return true;
        String lower = url.toLowerCase();
        return lower.startsWith("https://localhost")
            || lower.startsWith("http://localhost")
            || lower.startsWith("http://127.0.0.1")
            || lower.startsWith("https://127.0.0.1")
            || lower.startsWith("capacitor://")
            || lower.startsWith("about:")
            || lower.startsWith("data:")
            || lower.startsWith("blob:");
    }

    private boolean isFirebaseAuthUrl(Uri uri) {
        String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
        return host.endsWith("firebaseapp.com")
            || host.endsWith("firebaseio.com")
            || host.endsWith("googleapis.com")
            || host.endsWith("accounts.google.com");
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        View decorView = window.getDecorView();
        int brandBarColor = Color.parseColor("#032629");
        decorView.setBackgroundColor(brandBarColor);

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, decorView);
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }

        View content = findViewById(android.R.id.content);
        if (content != null) {
            content.setBackgroundColor(brandBarColor);
            ViewCompat.setOnApplyWindowInsetsListener(content, (v, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                boolean keyboardVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime());
                int bottomPad = keyboardVisible ? 0 : bars.bottom;
                v.setPadding(bars.left, bars.top, bars.right, bottomPad);
                return windowInsets;
            });
            ViewCompat.requestApplyInsets(content);
        }

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new ExternalBrowserBridge(), "AmaderAndroid");
            webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    String urlStr = uri != null ? uri.toString() : "";
                    String scheme = uri != null && uri.getScheme() != null ? uri.getScheme().toLowerCase() : "";
                    boolean isStandardWeb = "http".equals(scheme) || "https".equals(scheme);
                    boolean isActionUri = "tel".equals(scheme) || "mailto".equals(scheme) || "whatsapp".equals(scheme) || "sms".equals(scheme);

                    if (isActionUri) {
                        launchInDefaultBrowser(uri);
                        return true;
                    }
                    if (isStandardWeb && !isInternalAppUrl(urlStr) && !isFirebaseAuthUrl(uri)) {
                        launchInDefaultBrowser(uri);
                        return true;
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView webView = getBridge().getWebView();
                    String currentUrl = webView.getUrl();
                    if (currentUrl != null && !isInternalAppUrl(currentUrl)) {
                        if (webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            webView.loadUrl(getBridge().getServerUrl());
                        }
                        return;
                    }

                    webView.evaluateJavascript(
                        "(function(){ return window.__amaderHandleBack ? window.__amaderHandleBack() : false; })()",
                        value -> {
                            if (!"true".equals(value)) {
                                setEnabled(false);
                                getOnBackPressedDispatcher().onBackPressed();
                                setEnabled(true);
                            }
                        }
                    );
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });
    }
}
