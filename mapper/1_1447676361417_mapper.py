#!/usr/bin/env python
import sys
import datetime
# input comes from STDIN (standard input) 
for line in sys.stdin:

	word = line.partition('[')[-1].rpartition(']')[0].split()[0]
	word = word.split(":")

	word[0] = datetime.datetime.strptime(word[0], "%d/%b/%Y")
	word[0] = word[0].strftime("%Y-%m-%d")

	time = "%s T %s:00:00.000" % (word[0], word[1])

	print '%s\t%s' % (time, 1)