import { Coffee, Fuel, MapPin, ShoppingBag, Utensils } from 'lucide-react';

const ICONS = {
  Coffee,
  Fuel,
  MapPin,
  ShoppingBag,
  Utensils,
};

export default function CategoryIcon({ icon, size = 18 }) {
  const Icon = ICONS[icon] || MapPin;
  return <Icon size={size} aria-hidden="true" />;
}
