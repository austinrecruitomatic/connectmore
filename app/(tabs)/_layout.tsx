import { Tabs, useRouter } from 'expo-router';
import { Home, Package, BarChart3, User, Store, Users, DollarSign, Receipt, Shield } from 'lucide-react-native';
import { useAuth } from '@/lib/AuthContext';
import { useEffect } from 'react';

export default function TabLayout() {
  const { profile, user, loading } = useAuth();
  const router = useRouter();
  const isCompany = profile?.user_type === 'company';
  const isAffiliate = profile?.user_type === 'affiliate';
  const isSuperAdmin = profile?.is_super_admin === true;

  useEffect(() => {
    if (!loading && !user) {
      console.log('No user in tabs, redirecting to auth');
      router.replace('/auth/login');
    }
  }, [user, loading]);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#60A5FA',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopWidth: 1,
          borderTopColor: '#334155',
        },
        headerStyle: {
          backgroundColor: '#1E293B',
        },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: isCompany ? 'My Products' : 'Browse Products',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          headerTitle: 'Company Marketplace',
          headerShown: false,
          tabBarIcon: ({ size, color }) => <Store size={size} color={color} />,
          href: isAffiliate ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="partnerships"
        options={{
          title: isCompany ? 'Affiliates' : 'My Links',
          tabBarIcon: ({ size, color }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: 'Leads',
          tabBarIcon: ({ size, color }) => <Users size={size} color={color} />,
          href: isCompany ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals',
          tabBarIcon: ({ size, color }) => <DollarSign size={size} color={color} />,
          href: isCompany ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="commissions"
        options={{
          title: 'Commissions',
          tabBarIcon: ({ size, color }) => <Receipt size={size} color={color} />,
          href: isCompany ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ size, color }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ size, color }) => <Shield size={size} color={color} />,
          href: isSuperAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
