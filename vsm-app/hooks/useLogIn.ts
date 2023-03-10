import { useState, useEffect } from 'react'

interface UseLogInT {
  username: string
  password: string
}

// placeholder for real log in async interactions
const useLogIn = ({ username, password }: UseLogInT) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (username.length && password.length) {
      setIsLoggedIn(true)
    }
  }, [password.length, username.length])

  return [isLoggedIn, setIsLoggedIn]
}

export { useLogIn }
