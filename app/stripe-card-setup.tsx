import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function StripeCardSetupScreen() {
  const router = useRouter();
  const { clientSecret } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (!clientSecret) {
      Alert.alert('Error', 'No client secret provided');
      router.back();
      return;
    }

    const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Add Payment Card</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0F172A;
      color: #FFFFFF;
      padding: 20px;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #FFFFFF;
    }
    .description {
      font-size: 14px;
      color: #94A3B8;
      margin-bottom: 30px;
      line-height: 1.5;
    }
    #card-element {
      background-color: #1E293B;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    #card-element.StripeElement--focus {
      border-color: #3B82F6;
    }
    #card-element.StripeElement--invalid {
      border-color: #EF4444;
    }
    #card-errors {
      color: #EF4444;
      font-size: 14px;
      margin-top: 10px;
      min-height: 20px;
    }
    .security-notice {
      background-color: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
    }
    .security-text {
      font-size: 13px;
      color: #60A5FA;
      line-height: 1.4;
    }
    button {
      width: 100%;
      background-color: #3B82F6;
      color: #FFFFFF;
      border: none;
      border-radius: 12px;
      padding: 16px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    button:hover:not(:disabled) {
      background-color: #2563EB;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #FFFFFF;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 8px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .loading-message {
      background-color: #1E293B;
      padding: 24px;
      border-radius: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Add Payment Card</h1>
    <p class="description">
      Enter your card details to securely store your payment method with Stripe.
    </p>

    <form id="payment-form">
      <div id="card-element"></div>
      <div id="card-errors"></div>

      <div class="security-notice">
        <p class="security-text">
          🔒 Your payment information is securely processed by Stripe. We never store your card details.
        </p>
      </div>

      <button type="submit" id="submit-button">
        Add Card
      </button>
    </form>
  </div>

  <script>
    const stripe = Stripe('${publishableKey}');
    const elements = stripe.elements();

    const cardElement = elements.create('card', {
      style: {
        base: {
          color: '#FFFFFF',
          fontSize: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          '::placeholder': {
            color: '#94A3B8',
          },
          iconColor: '#94A3B8',
        },
        invalid: {
          color: '#EF4444',
          iconColor: '#EF4444',
        },
      },
    });

    cardElement.mount('#card-element');

    const form = document.getElementById('payment-form');
    const submitButton = document.getElementById('submit-button');
    const cardErrors = document.getElementById('card-errors');

    cardElement.on('change', (event) => {
      if (event.error) {
        cardErrors.textContent = event.error.message;
      } else {
        cardErrors.textContent = '';
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner"></span>Processing...';

      try {
        const { error, setupIntent } = await stripe.confirmCardSetup(
          '${clientSecret}',
          {
            payment_method: {
              card: cardElement,
            },
          }
        );

        if (error) {
          throw new Error(error.message);
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'success',
          setupIntentId: setupIntent.id,
        }));
      } catch (err) {
        cardErrors.textContent = err.message;
        submitButton.disabled = false;
        submitButton.textContent = 'Add Card';

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: err.message,
        }));
      }
    });

    // Notify that page is ready
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'ready',
    }));
  </script>
</body>
</html>
    `;

    setHtmlContent(html);
    setLoading(false);
  }, [clientSecret]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'ready') {
        console.log('Stripe form ready');
        return;
      }

      if (data.type === 'success') {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          Alert.alert('Error', 'Session expired');
          router.back();
          return;
        }

        const confirmResponse = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/company-setup-payment-method`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'confirm_payment_method',
              setupIntentId: data.setupIntentId,
            }),
          }
        );

        const confirmData = await confirmResponse.json();
        if (!confirmResponse.ok) throw new Error(confirmData.error);

        Alert.alert('Success', 'Card added successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }

      if (data.type === 'error') {
        console.error('Stripe error:', data.message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading payment form...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  webview: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
