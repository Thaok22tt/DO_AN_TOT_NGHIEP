import { useCallback, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import ConfirmModal from './ConfirmModal'
import ConfirmContext from './ConfirmContext'

export function ConfirmProvider({ children }) {
  const resolverRef = useRef(null)
  const [options, setOptions] = useState(null)

  const closeConfirm = useCallback((result) => {
    const resolver = resolverRef.current
    resolverRef.current = null
    setOptions(null)
    resolver?.(result)
  }, [])

  const confirm = useCallback((nextOptions = {}) => {
    if (resolverRef.current) {
      resolverRef.current(false)
    }

    setOptions({
      body: 'Bạn có chắc muốn tiếp tục thao tác này?',
      confirmLabel: 'Tiếp tục',
      title: 'Xác nhận thao tác',
      ...nextOptions,
    })

    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {options && (
        <ConfirmModal
          {...options}
          loading={false}
          onClose={() => closeConfirm(false)}
          onConfirm={() => closeConfirm(true)}
        />
      )}
    </ConfirmContext.Provider>
  )
}

ConfirmProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
