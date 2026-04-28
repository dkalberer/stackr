package repository

import "errors"

// ErrNotFound is returned when a requested record does not exist or the
// requesting user does not own it.
var ErrNotFound = errors.New("record not found")
