/**
 * Catches render errors so GitHub Pages users see a message instead of a blank tab
 * (no DevTools required).
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = { children: ReactNode };

type State = { error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error);
    console.error(info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error != null) {
      return (
        <View style={styles.box}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.msg}>{this.state.error.message}</Text>
            <Text style={styles.hint}>
              Try refreshing the page. If this keeps happening, open your browser’s developer
              console (for example F12) for details. After a fix, rebuild and publish the site
              again.
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '400',
    color: '#ffffff',
    marginBottom: 12,
  },
  msg: {
    fontSize: 14,
    color: '#ff8a8a',
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 22,
  },
});
