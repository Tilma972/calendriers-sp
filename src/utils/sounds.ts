export const playPaymentSuccess = () => {
  const audio = new Audio('/sounds/success.mp3');
  audio.volume = 0.7;
  audio.play().catch(() => {});
  
  // Bonus : vibration mobile
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
};

export const playPaymentError = () => {
  const audio = new Audio('/sounds/error.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {});
  
  // Vibration d'erreur
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100, 50, 100]);
  }
};

export const playNotification = () => {
  const audio = new Audio('/sounds/notification.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});
  
  // Vibration simple
  if ('vibrate' in navigator) {
    navigator.vibrate(200);
  }
};