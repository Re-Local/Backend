CC = gcc
CFLAGS = -Wall -g

TARGET = riscv-sim
OBJS = riscv.o disassembler.o

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f *.o $(TARGET)
