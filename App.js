import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import usePWAInstallPrompt from './usePWAinstallPrompt';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  //AsyncStorage.clear()
  const { isInstallable, promptInstall, isStandalone, wasInstalled, installationCompleted } = usePWAInstallPrompt();

  if (isInstallable) {
    alert("Pour continuer a utiliser werewolve, vous devez l'installer")
  }



  const linking = {
    prefixes: ['/'],
    config: {
      screens: {
        Home: '',
      },
    },
  };

  return (
    <>
      {
        isStandalone() || (window.location.host.includes('zrok')) /** Development purposes */ ?
          <NavigationContainer linking={linking}>
            < AuthProvider >
              <AppNavigator />
            </AuthProvider >
          </NavigationContainer >
          :

          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#222222" }}>

            {!wasInstalled() ?
              <TouchableOpacity onPress={() => {
                promptInstall().then((result) => {
                  if (result) {
                    alert("👍 L'installation de werewolve a été lancé")
                  } else
                    alert("❌ werewolve n'a pas été installé avec succes")
                })
              }}
                style={{ padding: 15, backgroundColor: "#ff2222", borderRadius: 10 }}
              >
                <Text style={{ fontSize: 18, color: 'white' }}> Installez werewolve </Text>
              </TouchableOpacity>
              :
              <>
                <ActivityIndicator size={"large"} />
                <Text style={{ fontSize: 18, color: 'white', padding: 20, textAlign: "center" }}> 🔃 werewolve est en cours d'installation, ou déjà installé, veillez vérifier parmis vos applications</Text>
                <TouchableOpacity onPress={() => {
                  promptInstall().then((result) => {
                    if (result) {
                      alert("👍 L'installation de werewolve a été lancé")
                    }
                  })
                }}
                  style={{ padding: 15, backgroundColor: "#ff2222", borderRadius: 10 }}
                >
                  <Text style={{ fontSize: 18, color: 'white' }}> Installez werewolve à nouveau </Text>
                </TouchableOpacity>
              </>
            }

          </View>
      }
    </>
  );
}