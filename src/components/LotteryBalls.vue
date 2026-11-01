<script setup lang="ts">
import { number } from "../utils/format";
defineProps<{ reds?: number[]; blues?: number[]; compact?: boolean }>();
</script>
<template>
  <div class="lottery-balls" :class="{ compact }">
    <span v-for="n in reds" :key="`r${n}`" class="lottery-ball red">{{
      number(n)
    }}</span
    ><span v-if="reds?.length && blues?.length" class="ball-divider">+</span
    ><span v-for="n in blues" :key="`b${n}`" class="lottery-ball blue">{{
      number(n)
    }}</span>
  </div>
</template>
