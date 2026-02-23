import type React from "react"
import useAuth from "../context/useAuth"
import { Navigate } from "react-router"

interface Props {
	children: React.ReactNode
}

const ProtectedRoute = ({children} : Props) => {
	const {authTokens} = useAuth()

	if (!authTokens) {
		return <Navigate to="/login" />
	}
  return children
}

export default ProtectedRoute