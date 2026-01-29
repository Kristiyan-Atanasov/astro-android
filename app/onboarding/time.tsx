import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';

const backgroundImg = require('../../assets/images/background.png');
const starsImg = require('../../assets/images/stars.png');

export default function TimeScreen() {
  const router = useRouter();
  const [hour, setHour] = useState('8');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('PM');

  const handleNext = () => {
    router.push('/onboarding/location');
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image source={backgroundImg} style={styles.bg} resizeMode="cover" />
      <Image source={starsImg} style={styles.stars} resizeMode="cover" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Birth of Time</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.step, i <= 2 && styles.activeStep]} // 3rd step (index 2)
                />
              ))}
            </View>
            <Text style={styles.progressText}>60%</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Time is important for determining your houses,{"\n"}
          rising sign, and exact moon position.
        </Text>

        {/* Time Pickers */}
        <View style={styles.pickerRow}>
          <Picker
            selectedValue={hour}
            style={styles.picker}
            onValueChange={setHour}
            itemStyle={styles.pickerItem}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const val = (i + 1).toString();
              return <Picker.Item key={val} label={val} value={val} />;
            })}
          </Picker>

          <Picker
            selectedValue={minute}
            style={styles.picker}
            onValueChange={setMinute}
            itemStyle={styles.pickerItem}
          >
            {['00', '01', '02', '03', '04', '05', '10', '15', '30', '45', '59'].map((val) => (
              <Picker.Item key={val} label={val} value={val} />
            ))}
          </Picker>

          <Picker
            selectedValue={period}
            style={styles.picker}
            onValueChange={setPeriod}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item label="AM" value="AM" />
            <Picker.Item label="PM" value="PM" />
          </Picker>
        </View>

        {/* Info */}
        <Text style={styles.info}>
          We use this to generate your AstroInsights{"\n"}wheel. We never share or sell your data.
        </Text>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity>
            <Text style={styles.skipText}>I don’t know</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext}>
            <LinearGradient
              colors={['rgba(178, 131, 237, 1)', 'rgba(87, 124, 251, 1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButton}
            >
              <Text style={styles.nextText}>Next</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    position: 'absolute',
    width,
    height,
    zIndex: -2,
  },
  stars: {
    position: 'absolute',
    width,
    height,
    zIndex: -1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(57, 60, 71, 0.4)',
    borderRadius: 999,
    padding: 10,
  },
  title: {
    fontSize: 24,
    color: '#fff',
    fontFamily: 'CooperLtBT-Bold',
  },
  progressWrapper: {
    marginBottom: 30,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  step: {
    height: 8,
    flex: 1,
    borderRadius: 4,
    backgroundColor: '#333',
    marginRight: 6,
  },
  activeStep: {
    backgroundColor: 'rgba(87, 124, 251, 1)',
  },
  progressText: {
    fontSize: 12,
    color: '#aaa',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(200, 200, 200, 1)',
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 40,
  },
  picker: {
    width: 100,
    height: 160,
  },
  pickerItem: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'SFProDisplay-Regular',
  },
  info: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'SFProDisplay-Regular',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SFProDisplay-Regular',
  },
  nextButton: {
    height: 60,
    width: 150,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});
