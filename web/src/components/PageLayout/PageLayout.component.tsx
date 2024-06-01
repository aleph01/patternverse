import { ReactNode } from "react";
import { Column } from "../Column";
import { Header, HeaderProps } from "../Header";

interface PageLayoutProps {
  children: ReactNode;
  headerProps?: HeaderProps;
}

export const PageLayout = ({children, headerProps}: PageLayoutProps) => {
  return (
    <Column crossaxisalignment="start" fullwidth>
      <Header {...headerProps} />
      {children}
    </Column>
  );
}