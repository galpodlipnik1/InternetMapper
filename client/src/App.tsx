import { BrowserRouter, Route, Routes as Switch } from "react-router-dom"
import Home from "./pages/home"

const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/" element={<Home />} />
      </Switch>
    </BrowserRouter>
  )
}

export default App