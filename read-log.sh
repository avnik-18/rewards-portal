#!/bin/sh
grep -n -B1 -A14 "AssertionError\|TestingLibrary\|expect(" /tmp/sc-clean.log | sed -n '1,50p'
