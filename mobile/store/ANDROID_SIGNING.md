# Android release signing

## 1. Create a release keystore (once)

```bash
keytool -genkeypair -v \
  -keystore stocknews-release.keystore \
  -alias stocknews \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Orange Cloud, OU=Mobile, O=Orange Cloud, L=Ho Chi Minh, ST=HCM, C=VN"
```

Store the keystore and passwords securely (password manager / CI secrets). **Never commit the keystore to git.**

## 2. Configure Gradle

Create `android/keystore.properties` (gitignored):

```properties
storeFile=../../stocknews-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=stocknews
keyPassword=YOUR_KEY_PASSWORD
```

Add to `android/app/build.gradle` inside `android {`:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

## 3. Build release AAB

```bash
cd android
./gradlew bundleRelease
```

## 4. App Links fingerprint

Get SHA-256 of release certificate:

```bash
keytool -list -v -keystore stocknews-release.keystore -alias stocknews | grep SHA256
```

Update Worker `src/ui/mobile-deep-links.ts` → deploy → verify:

https://stocknews.orangecloud.vn/.well-known/assetlinks.json

## 5. Play App Signing

Google Play recommends enrolling in **Play App Signing**. Upload your AAB; Google manages the app signing key.
