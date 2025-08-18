import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TokenProvider } from './src/context/TokenContext';
import DashboardScreen from './src/screens/Dashboard';
import ContractsScreen from './src/screens/ContractsScreen';
import MapScreen from './src/screens/MapScreen';
import ShipyardScreen from './src/screens/ShipyardScreen';
import MiningScreen from './src/screens/MiningScreen';
import MarketScreen from './src/screens/MarketScreen';
import OperationsScreen from './src/screens/OperationsScreen';

const Tab = createBottomTabNavigator();

export default function MobileApp() {
  return (
    <TokenProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName = '';
              
              switch (route.name) {
                case 'Dashboard':
                  iconName = '🏠';
                  break;
                case 'Contracts':
                  iconName = '📋';
                  break;
                case 'Map':
                  iconName = '🗺️';
                  break;
                case 'Shipyard':
                  iconName = '🚢';
                  break;
                case 'Mining':
                  iconName = '⛏️';
                  break;
                case 'Market':
                  iconName = '💰';
                  break;
                case 'Operations':
                  iconName = '⚙️';
                  break;
              }
              
              return <span style={{ fontSize: size }}>{iconName}</span>;
            },
            tabBarActiveTintColor: '#4CAF50',
            tabBarInactiveTintColor: '#ccc',
            tabBarStyle: {
              backgroundColor: '#1a1a1a',
              borderTopColor: '#333',
            },
            headerStyle: {
              backgroundColor: '#1a1a1a',
            },
            headerTintColor: '#4CAF50',
          })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Contracts" component={ContractsScreen} />
          <Tab.Screen name="Map" component={MapScreen} />
          <Tab.Screen name="Shipyard" component={ShipyardScreen} />
          <Tab.Screen name="Mining" component={MiningScreen} />
          <Tab.Screen name="Market" component={MarketScreen} />
          <Tab.Screen name="Operations" component={OperationsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </TokenProvider>
  );
}