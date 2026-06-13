plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.wrst.runtime"
    compileSdk = 36

    defaultConfig {
        minSdk = 30
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.ui)
    implementation(libs.ui.graphics)
    implementation(libs.compose.material)
    implementation(libs.compose.foundation)
    implementation(libs.compose.navigation)
    // For the runtime permission launcher (rememberLauncherForActivityResult);
    // also brings androidx.core (ContextCompat) transitively.
    implementation(libs.activity.compose)
    // api: the consuming app links QuickJS transitively (it's part of the runtime).
    api(libs.quickjs.kt.v105)
    implementation(libs.okhttp)
}
