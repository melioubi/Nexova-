#!/bin/sh
set -eu

mode=dev
set -- --webpack
if [ "${APP_MODE:?APP_MODE is required}" = "production" ]; then
  mode=start
  set --
fi
npm --prefix /app/website run "$mode" -- --hostname 0.0.0.0 --port "${WEBSITE_PORT:?}" "$@" &
website_pid=$!
npm --prefix /app/backoffice run "$mode" -- --hostname 0.0.0.0 --port "${BACKOFFICE_PORT:?}" "$@" &
backoffice_pid=$!
cleanup() {
  trap - EXIT INT TERM
  kill "$website_pid" "$backoffice_pid" 2>/dev/null || true
  wait "$website_pid" "$backoffice_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
wait -n "$website_pid" "$backoffice_pid"