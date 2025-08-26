package com.helscode.woaw;

import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.Window;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    Window window = getWindow();

    // 1) Edge-to-edge controlado por nosotros (clave para Samsung)
    WindowCompat.setDecorFitsSystemWindows(window, false);

    // 2) Colores (opcional, visual)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      window.setStatusBarColor(0xFFD62828);  // rojo
      window.setNavigationBarColor(0xFF101010); // oscuro
    }

    // 3) APLICA INSETS AL ROOT VIEW (no solo al WebView)
    final View root = findViewById(android.R.id.content);
    ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
      Insets sysBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
      // Empuja TODO el contenido por debajo de la status bar y por encima de la nav bar
      v.setPadding(sysBars.left, sysBars.top, sysBars.right, sysBars.bottom);
      return WindowInsetsCompat.CONSUMED; // consumimos para evitar doble aplicación en Samsung
    });
    ViewCompat.requestApplyInsets(root);
  }
}