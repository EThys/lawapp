<script setup lang="ts">
import { computed, ref } from 'vue'
import { VueTelInput } from 'vue-tel-input'
import type { CountryObject, PhoneObject } from 'vue-tel-input'
import 'vue-tel-input/vue-tel-input.css'
import { phoneForApi, stripLeadingTrunkZero } from '@/utils/auth'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    error?: string
    hint?: string
    required?: boolean
    disabled?: boolean
    defaultCountry?: string
  }>(),
  {
    defaultCountry: 'CD',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const displayPhone = ref('')
const countryIso = ref(props.defaultCountry.toUpperCase())
const dialCode = ref('243')

const dropdownOptions = {
  showFlags: true,
  showDialCodeInSelection: true,
  showDialCodeInList: true,
  showSearchBox: true,
  searchBoxPlaceholder: 'Pays ou indicatif…',
}

const inputOptions = computed(() => ({
  placeholder: '854434602',
  required: props.required,
  autocomplete: 'tel-national',
  type: 'tel',
  inputmode: 'numeric' as const,
  showDialCode: false,
  styleClasses: 'app-phone-input__field',
}))

function pushE164(nationalRaw: string, iso: string) {
  const national = stripLeadingTrunkZero(nationalRaw)
  displayPhone.value = national
  emit('update:modelValue', national ? phoneForApi(national, iso) : '')
}

function onInput(_number: string, phoneObject: PhoneObject) {
  if (phoneObject.country?.iso2) {
    countryIso.value = phoneObject.country.iso2.toUpperCase()
  }
  if (phoneObject.country?.dialCode) {
    dialCode.value = phoneObject.country.dialCode
  }

  let national = (phoneObject.nationalNumber || '').replace(/\D/g, '')
  if (dialCode.value && national.startsWith(dialCode.value)) {
    national = national.slice(dialCode.value.length)
  }
  national = stripLeadingTrunkZero(national)
  pushE164(national, countryIso.value)
}

function onCountryChanged(country: CountryObject) {
  countryIso.value = (country.iso2 || 'CD').toUpperCase()
  dialCode.value = country.dialCode || '243'
  pushE164(displayPhone.value, countryIso.value)
}
</script>

<template>
  <div class="space-y-1.5 app-phone-input">
    <label v-if="label" class="block text-xs font-medium text-ink-muted uppercase tracking-wide">
      {{ label }}
      <span v-if="required" class="text-danger normal-case"> *</span>
    </label>
    <VueTelInput
      v-model="displayPhone"
      class="app-phone-input__tel"
      :class="{ 'app-phone-input__tel--error': !!error }"
      :disabled="disabled"
      :default-country="defaultCountry"
      :auto-default-country="false"
      mode="national"
      :auto-format="false"
      :valid-characters-only="true"
      :preferred-countries="['CD', 'CG', 'FR', 'BE', 'CA', 'US']"
      :dropdown-options="dropdownOptions"
      :input-options="inputOptions"
      @on-input="onInput"
      @country-changed="onCountryChanged"
    />
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-ink-faint">{{ hint }}</p>
  </div>
</template>

<style>
.app-phone-input__tel.vue-tel-input {
  border: 1px solid var(--color-line, #e5e2dc);
  border-radius: 0;
  background: #fff;
  min-height: 2.75rem;
}
.app-phone-input__tel.vue-tel-input:focus-within {
  border-color: var(--color-accent, #1a6b4a);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent, #1a6b4a) 20%, transparent);
}
.app-phone-input__tel--error.vue-tel-input {
  border-color: color-mix(in srgb, #c43c3c 40%, transparent);
}
.app-phone-input__tel .vti__dropdown {
  background: var(--color-paper, #f7f5f0);
  border-radius: 0;
  padding-inline: 0.5rem;
}
.app-phone-input__tel .vti__dropdown:hover,
.app-phone-input__tel .vti__dropdown.open {
  background: var(--color-paper, #f7f5f0);
}
.app-phone-input__tel .vti__input,
.app-phone-input__field {
  font-size: 0.875rem;
  color: var(--color-ink, #1a1a1a);
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  min-height: 2.75rem;
  padding: 0.625rem 0.875rem;
}
.app-phone-input__tel .vti__dropdown-list {
  border-radius: 0;
  border-color: var(--color-line, #e5e2dc);
  z-index: 40;
}
</style>
