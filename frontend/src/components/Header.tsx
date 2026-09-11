import "./Header.css";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="page-header">
      <h1 className="page-header__title">{title}</h1>
      <div className="page-header__right">Manumatik Auto Parts Center</div>
    </header>
  );
}