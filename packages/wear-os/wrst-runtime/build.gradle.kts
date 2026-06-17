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
    // Material icon vectors (Icons.Filled.*) for the Icon component. Version is
    // managed by the Compose BOM above.
    implementation("androidx.compose.material:material-icons-core")
    // For the runtime permission launcher (rememberLauncherForActivityResult);
    // also brings androidx.core (ContextCompat) transitively.
    implementation(libs.activity.compose)
    // Async image loading (URL → cached bitmap) for the Image component.
    implementation("io.coil-kt:coil-compose:2.7.0")
    // Wearable Data Layer (CapabilityClient / MessageClient / NodeClient) backing
    // the Companion API (phone↔watch link). iOS twin: WatchConnectivity.
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    // api: the consuming app links QuickJS transitively (it's part of the runtime).
    api(libs.quickjs.kt.v105)
    implementation(libs.okhttp)
}
