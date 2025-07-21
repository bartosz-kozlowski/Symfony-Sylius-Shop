<?php

declare(strict_types=1);

namespace App\Entity\Tracking;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Click
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'integer')]
    private int $x;

    #[ORM\Column(type: 'integer')]
    private int $y;

    #[ORM\Column(type: 'string')]
    private string $path;

    #[ORM\Column(type: 'string')]
    private string $element;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $timestamp;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getX(): int
    {
        return $this->x;
    }

    public function setX(int $x): void
    {
        $this->x = $x;
    }

    public function getY(): int
    {
        return $this->y;
    }

    public function setY(int $y): void
    {
        $this->y = $y;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function setPath(string $path): void
    {
        $this->path = $path;
    }

    public function getElement(): string
    {
        return $this->element;
    }

    public function setElement(string $element): void
    {
        $this->element = $element;
    }

    public function getTimestamp(): \DateTimeInterface
    {
        return $this->timestamp;
    }

    public function setTimestamp(\DateTimeInterface $timestamp): void
    {
        $this->timestamp = $timestamp;
    }
}
