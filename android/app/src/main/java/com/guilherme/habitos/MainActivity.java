package com.guilherme.habitos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Ignora a configuração de tamanho de fonte do sistema (acessibilidade),
        // que escalava o layout inteiro via rem/em e quebrava a UI em telas com fonte grande.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
