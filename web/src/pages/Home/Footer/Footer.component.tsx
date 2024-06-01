import { Link } from "react-router-dom"
import { FooterContainer } from "./Footer.styled"

export const Footer = () => {
  return (
    <FooterContainer>
      <Link to={"/about"}><p>About</p></Link>
    </FooterContainer>

  )
}