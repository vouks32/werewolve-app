// navigation/AppNavigator.js
import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../screens/LoadingScreen';
import RoleGateway from '../screens/RoleGateway';
import Login from '../screens/Login';
import Home from '../screens/Home';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#121212' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      {user ? (
        // Authenticated screens
        <>
          <Stack.Screen
            name="Home"
            component={Home}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={Login}
            options={{ title: 'Login' }}
          />
          <Stack.Screen
            name="RoleGateway"
            component={RoleGateway}
            options={{ title: 'Create Account' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;