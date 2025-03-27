#include <stdio.h>
#include <stdint.h>
#include "disassembler.h"

int main(int argc, char *argv[]) {
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <input_file>\n", argv[0]);
        return 1;
    }

    FILE *file = fopen(argv[1], "rb");
    if (!file) {
        perror("Failed to open file");
        return 1;
    }

    uint32_t instruction;
    int index = 0;

    while (fread(&instruction, sizeof(uint32_t), 1, file)) {
        printf("inst %d: %08x ", index, instruction);
        print_instruction(instruction);
        index++;
    }

    fclose(file);
    return 0;
}
