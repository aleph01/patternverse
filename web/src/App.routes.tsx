import { Route, Routes } from "react-router-dom"
import { AboutPage } from "./pages/About/AboutPage"
import { HomePage } from "./pages/Home"
import { PageDetail } from "./pages/PageDetail/PageDetail"
import { Collection } from "./pages/Collection/Collection"
import { ImpressumPage } from "./pages/Impressum/ImpressumPage"

export const AppRoutes = () => {

  return (
    <Routes key="primary">
      <Route path="impressum" element={<ImpressumPage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="/patterns/:id" element={<PageDetail />} />
      <Route path="/collections/:id" element={<Collection />} />

      <Route path="*" element={<HomePage />} />

    </Routes>
  )

}