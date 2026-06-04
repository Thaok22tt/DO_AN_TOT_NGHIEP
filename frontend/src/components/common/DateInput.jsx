import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

const isoToDisplayDate = (value) => {
  if (!value) return ''
  const [year, month, day] = String(value).slice(0, 10).split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

const displayToIsoDate = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null

  const [, dayValue, monthValue, yearValue] = match
  const day = Number(dayValue)
  const month = Number(monthValue)
  const year = Number(yearValue)
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return `${yearValue}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const maskDisplayDate = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function DateInput({ name, onChange, placeholder = 'dd/mm/yyyy', value = '', ...props }) {
  const [displayValue, setDisplayValue] = useState(() => isoToDisplayDate(value))
  const nativeInputRef = useRef(null)

  useEffect(() => {
    setDisplayValue(isoToDisplayDate(value))
  }, [value])

  const emitChange = (nextValue) => {
    onChange({
      target: {
        name,
        value: nextValue,
      },
    })
  }

  const handleChange = (event) => {
    const nextDisplayValue = maskDisplayDate(event.target.value)
    setDisplayValue(nextDisplayValue)

    if (!nextDisplayValue.trim()) {
      emitChange('')
      return
    }

    const isoDate = displayToIsoDate(nextDisplayValue)
    if (isoDate) {
      emitChange(isoDate)
    }
  }

  const handleBlur = () => {
    if (!displayValue.trim()) {
      setDisplayValue('')
      return
    }

    const isoDate = displayToIsoDate(displayValue)
    setDisplayValue(isoDate ? isoToDisplayDate(isoDate) : isoToDisplayDate(value))
  }

  const handleNativeChange = (event) => {
    const nextValue = event.target.value
    setDisplayValue(isoToDisplayDate(nextValue))
    emitChange(nextValue)
  }

  const openNativePicker = () => {
    const nativeInput = nativeInputRef.current
    if (!nativeInput) return

    const isoDate = displayToIsoDate(displayValue)
    if (isoDate) {
      nativeInput.value = isoDate
    }

    if (typeof nativeInput.showPicker === 'function') {
      nativeInput.showPicker()
      return
    }

    nativeInput.focus()
    nativeInput.click()
  }

  return (
    <span className="date-input-control">
      <input
        {...props}
        inputMode="numeric"
        name={name}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder={placeholder}
        type="text"
        value={displayValue}
      />
      <button aria-label="Mở lịch" onClick={openNativePicker} type="button">
        <span aria-hidden="true" className="material-symbols-outlined">calendar_today</span>
      </button>
      <input
        aria-hidden="true"
        className="date-input-native"
        onChange={handleNativeChange}
        ref={nativeInputRef}
        tabIndex="-1"
        type="date"
        value={displayToIsoDate(displayValue) || value || ''}
      />
    </span>
  )
}

DateInput.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string,
}

export default DateInput
