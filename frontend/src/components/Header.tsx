import NotificationBell from "./NotificationBell";
import "./Header.css";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="page-header">
      <h1 className="page-header__title">{title}</h1>
      <div className="page-header__right">
        <NotificationBell />
        <span className="page-header__brand">Manumatik Auto Parts Center</span>
      </div>
    </header>
  );
}