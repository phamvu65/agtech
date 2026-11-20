import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function App() {
  const [status, setStatus] = useState('Not checked');
  async function checkApi() {
    setStatus('Loading');
    try {
      const response = await fetch('http://10.0.2.2:8012/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setStatus(data.status === 'ok' ? 'API connected' : 'Unexpected response');
    } catch { setStatus('API unavailable — retry'); }
  }
  return <View style={styles.container}><Text>AGTECH G0 — disposable Android API spike</Text>
    <Text accessibilityLiveRegion="polite">{status}</Text><Button title="Retry API" onPress={checkApi}/></View>;
}
const styles = StyleSheet.create({container: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20}});
